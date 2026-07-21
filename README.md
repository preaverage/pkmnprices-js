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

List endpoints return `{ data, pagination }`. Listing endpoints (eBay/Cardmarket/TCGplayer) use cursors instead. Both have iterator helpers if you'd rather not track pages or cursors yourself:

```ts
for await (const card of client.cards.iterate({ name: "charizard" })) {
  console.log(card.name);
}

const allSets = await client.sets.listAll({ language: "english" });

for await (const sale of client.cards.listings.iterateEbay(789, { grader: "PSA", grade: "10" })) {
  console.log(sale.title, sale.price);
}

for await (const offer of client.cards.listings.iterateTcgplayer(789, { condition: "Near Mint" })) {
  console.log(offer.seller_name, offer.price, offer.shipping_price);
}
```

## Currency

Every price has a `currency` field. Cardmarket prices may also include nullable `low`, `trend`, and `avg` Price Guide values (`market_price` remains the primary display field). Pass `currency` (`"usd"` or `"eur"`) to filter, or leave it off to get everything your plan allows. EUR (Cardmarket) prices need a Pro plan; a free key asking for `eur` gets a `ForbiddenError`.

```ts
const card = await client.cards.get(789, { currency: "usd" });
```

## Cardmarket Mapping

Card detail responses expose Cardmarket's stable product identifiers when a
mapping is available:

```ts
const card = await client.cards.get(789);
console.log(card.cardmarket_url);
console.log(card.cardmarket_product_id);
```

Both fields are `null` until the card has been mapped.

## Methods

```
client.health()

client.sets          list  get  iterate  listAll
client.cards         list  get  iterate  listAll  priceHistory  iteratePriceHistory
client.cards.listings   ebay  iterateEbay  allEbay  cardmarket  iterateCardmarket  allCardmarket  tcgplayer  iterateTcgplayer  allTcgplayer
client.sealed        list  get  iterate  listAll  priceHistory  listings  iterateListings  allListings
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
