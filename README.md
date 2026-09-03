# @pkmnprices/sdk

TypeScript/JavaScript client for the [Pkmn Prices API](https://pkmnprices.com). Pokemon TCG card pricing from TCGPlayer, Cardmarket, and eBay.

No dependencies. Uses the built-in `fetch`, so it runs on Node 18+, browsers, Deno, Bun, and Workers. Ships ESM and CommonJS with types.

## Install

```bash
npm install @pkmnprices/sdk
```

## Usage

```ts
import { PkmnPrices } from "@pkmnprices/sdk";

const client = new PkmnPrices({ apiKey: "pk_your_key_here" });

const { data } = await client.cards.list({ name: "charizard", per_page: 10 });

const card = await client.cards.get(data[0].id);
for (const price of card.prices) {
  const symbol = price.currency === "EUR" ? "€" : "$";
  console.log(`${price.source}: ${symbol}${price.market_price}`);
}
```

Grab an API key from <https://pkmnprices.com/dashboard>.

## Options

```ts
new PkmnPrices({
  apiKey: "pk_...",  // sent as the x-api-key header
  maxRetries: 2,     // retries on 429 rate limits and 5xx/network errors
  timeoutMs: 30_000, // per-request timeout
});
```

Rate-limit `429`s are retried with backoff. Credit-limit `429`s (`credit_limit_exceeded`) are not, since they don't reset until the next day.

## Pagination

List endpoints return `{ data, pagination }`. Listing endpoints (eBay, Cardmarket, and TCGplayer) use cursors instead. Both have iterator helpers if you'd rather not track pages or cursors yourself:

```ts
for await (const card of client.cards.iterate({ name: "charizard" })) {
  console.log(card.name);
}

const allSets = await client.sets.listAll({ language: "english" });

for await (const sale of client.cards.listings.iterateEbay(789, { graded: true, grader: "PSA", grade: "10" })) {
  console.log(sale.title, sale.price);
}

for await (const offer of client.cards.listings.iterateCardmarket(789, { condition: "Near Mint", variant: "Reverse Holo" })) {
  console.log(offer.seller, offer.price, offer.language);
}

for await (const offer of client.cards.listings.iterateTcgplayer(789, { condition: "Near Mint" })) {
  console.log(offer.seller_name, offer.price, offer.shipping_price);
}
```

Sealed products carry the same two listing sources, under `client.sealed.listings`:

```ts
for await (const offer of client.sealed.listings.iterateTcgplayer(5678)) {
  console.log(offer.seller_name, offer.price, offer.quantity);
}

for await (const sale of client.sealed.listings.iterateEbay(5678, { sort: "price_desc" })) {
  console.log(sale.title, sale.price, sale.sold_at);
}
```

Sealed TCGplayer offers are normally condition `"Unopened"` with an empty
`printing`, so those two filters rarely narrow anything. Sealed eBay sales are
never graded, so `graded`, `grader`, and `grade` aren't accepted there and
`grader`/`grade` come back `null`.

## Which card a comp is really about

A variant and its base card can map to one source product page. When that
happens, both serve the same sales, and the titles describe whichever printing
the seller actually sold. Every eBay comp says which case it is:

```ts
for await (const sale of client.cards.listings.iterateEbay(17679)) {
  if (sale.attribution === "shared") continue; // another card's evidence
  console.log(sale.variant, sale.title, sale.price);
}
```

`exact` means the source page belongs to this card alone. `shared` means the
sale appears under at least one other card too, so it prices the group rather
than this entity. `unknown` means the comp was collected before the source
printing was recorded. A feed that is entirely `shared` is not evidence about
the card you asked for.

`variant` also works as a filter, so a card mapped for more than one printing
can be read one printing at a time:

```ts
const holo = await client.cards.listings.allEbay(789, { variant: "Holofoil" });
```

## Polling for new comps

Credits are charged per row returned, so re-reading a page of comps you already
hold to find out that nothing changed is the expensive way to stay current.
`since` returns only what arrived after a point you name:

```ts
let checkpoint = "2026-09-01T02:40:15.126147Z";

const page = await client.cards.listings.ebay(789, { since: checkpoint });
for (const sale of page.data) console.log(sale.title, sale.price);
if (page.data.length) checkpoint = page.data[0].ingested_at;
```

Checkpoint on `ingested_at`, not `sold_at`. They are different: `sold_at` is
when the sale happened, `ingested_at` is when we collected it, and a collection
run regularly brings in sales that are weeks old. A sale-date bound would step
over those permanently.

The bound is exclusive, so passing back the `ingested_at` you were given never
repeats that row. `ingested_at` ends in `Z` rather than `+00:00` so it survives
a query string without escaping. `since` also accepts a bare `YYYY-MM-DD`
(midnight UTC), which suits a backfill more than a poll: re-running it the same
day returns the same rows, and pays for them again.

A card with nothing new returns an empty `data` array.

## TCGplayer freshness

`updated_at` on a TCGplayer offer is not a freshness signal. It moves only when
that listing's own price, quantity or seller details change, so an offer that
has been live and unchanged for a month keeps a month-old `updated_at` however
recently it was confirmed.

`snapshot_at` is the freshness field: when that product's listings were last
confirmed against TCGplayer. It is the same for every row in a response, since
a snapshot replaces a product's listings wholesale. Listings refresh daily, so
a `snapshot_at` well over a day old means that product's last fetch did not
succeed and you are looking at the previous snapshot.

One thing `snapshot_at` cannot tell you: listings are collected from a US
vantage point with no shipping-destination filter, so a response can contain
offers TCGplayer's own site hides from you when you browse it from elsewhere.

## Cardmarket special attributes

Cardmarket sells more than one kind of good under a single card. Every
Cardmarket offer carries three booleans, and they are always present:

```ts
for await (const offer of client.cards.listings.iterateCardmarket(789)) {
  if (offer.graded) console.log(offer.grader, offer.grade); // "PSA", "10"
  if (offer.signed || offer.altered) continue;              // not a clean card
}
```

A `signed`, `altered` or `graded` offer is real, and it is returned, but it does
**not** contribute to the card's market price. A signed and altered Near Mint
copy at EUR 200 must not set the Near Mint price of a card whose clean copies
sell for EUR 3,800, and a slab is priced for the slab rather than for the card.

The practical consequence: **the cheapest row you get back is not necessarily
the card's `market_price`.** Filter these out before deriving a price yourself.

`grader` and `grade` are named to match the graded eBay sale shape, so "PSA 10"
renders the same way whichever source it came from. Both are `null` unless
`graded` is true, and can be `null` even then — Cardmarket flags a slab without
always naming the grader, and the details are read from free-text seller
comments.

## Languages

A card's language comes from its set, and it decides what pricing that card can
ever have.

| Language | Cards | Pricing | Plan |
|----------|-------|---------|------|
| English | 28,158 | USD (TCGplayer, eBay) + EUR (Cardmarket) | Free |
| Japanese | 29,660 | USD + EUR | Pro+ |
| German | 13,078 | EUR (Cardmarket) only | Pro+ |

```ts
const german = await client.cards.list({ language: "German", currency: "eur" });
```

Spelling is normalised: `"German"`, `"german"`, `"de"` and `"DE"` all resolve to
the same thing, and responses come back in the canonical form (`"German"`).

**German cards have no USD price and never will** — TCGplayer does not sell
German product. Asking for German with `currency: "usd"` returns an empty list
rather than an error, so reach for `"eur"`.

A free key is limited to English. Asking for Japanese or German throws a
`ForbiddenError`, and omitting `language` returns English only rather than the
whole catalogue.

German coverage runs from HeartGold & SoulSilver (2010) to current sets.

## Currency

Every price has a `currency` field. Pass `currency` (`"usd"` or `"eur"`) to filter, or leave it off to get everything your plan allows. EUR (Cardmarket) prices need a Pro plan; a free key asking for `eur` gets a `ForbiddenError`.

```ts
const card = await client.cards.get(789, { currency: "usd" });
const box = await client.sealed.get(5678, { currency: "eur" });
```

Cardmarket current prices are condition- and printing-specific marketplace
prices. Each EUR row has one `market_price` for its exact `condition` and
`variant`; for example, a Near Mint Reverse Holofoil price is distinct from a
Mint or Normal price. The retired Price Guide `low`, `trend`, and `avg` fields
are not returned. Live Cardmarket listings are automatically restricted to the
card's language.

## Cardmarket Mapping

Card and sealed detail responses expose Cardmarket's stable product identifiers
when a mapping is available:

```ts
const card = await client.cards.get(789);
console.log(card.cardmarket_url);
console.log(card.cardmarket_product_id);

const box = await client.sealed.get(5678);
console.log(box.cardmarket_url);
console.log(box.cardmarket_product_id);
```

Both fields are `null` until the product has been mapped.

## Methods

```
client.health()

client.sets          list  get  iterate  listAll
client.cards         list  get  iterate  listAll  priceHistory  iteratePriceHistory
client.cards.listings   ebay  iterateEbay  allEbay  cardmarket  iterateCardmarket  allCardmarket  tcgplayer  iterateTcgplayer  allTcgplayer
client.sealed        list  get  iterate  listAll  priceHistory  iteratePriceHistory
client.sealed.listings  ebay  iterateEbay  allEbay  tcgplayer  iterateTcgplayer  allTcgplayer
```

## Errors

Everything thrown extends `PkmnPricesError`, which carries `status`, `code`, `message`, `rateLimit`, and `retryAfterMs`.

```ts
import { ForbiddenError, NotFoundError, RateLimitError } from "@pkmnprices/sdk";

try {
  await client.cards.get(789, { currency: "eur" });
} catch (err) {
  if (err instanceof ForbiddenError) {
    // needs a higher plan
  } else if (err instanceof NotFoundError) {
    // no such card
  } else if (err instanceof RateLimitError) {
    // ran out of retries
  }
}
```

Subclasses: `BadRequestError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `CreditLimitError` and `RateLimitError` (429), `InternalServerError` (5xx), `ConnectionError` (network/timeout).

## License

MIT
