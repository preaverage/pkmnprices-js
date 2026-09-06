export type Currency = "USD" | "EUR";

// Accepted on the wire case-insensitively.
export type CurrencyFilter = "usd" | "eur" | "USD" | "EUR";

export type PriceSource = "tcgplayer" | "ebay" | "cardmarket";

export interface PageInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PageInfo;
}

export interface CursorInfo {
  has_more: boolean;
  next_cursor: string | null;
  count: number;
}

export interface CursorPaginated<T> {
  data: T[];
  pagination: CursorInfo;
}

export interface PageParams {
  page?: number;
  per_page?: number;
}

export interface CursorParams {
  limit?: number;
  cursor?: string;
}

export interface SetRef {
  id: number;
  name: string;
}

export interface Set {
  id: number;
  tcg_player_id: number;
  name: string;
  language: string;
  card_count: number;
}

export interface Price {
  source: PriceSource;
  currency: Currency;
  condition: string | null;
  variant: string | null;
  /** Current price for this exact source, condition, and variant. */
  market_price: number;
  created_at: string;
}

export interface CardSummary {
  id: number;
  tcg_player_id: number;
  name: string;
  image_url: string | null;
  number: string | null;
  total_set_number: string | null;
  rarity: string | null;
  artist: string | null;
  hp: number | null;
  set: SetRef;
}

export interface Card extends CardSummary {
  cardmarket_url: string | null;
  cardmarket_product_id: number | null;
  stage: string | null;
  card_type: string | null;
  weakness: string | null;
  resistance: string | null;
  retreat_cost: number | null;
  energy_type: string[] | null;
  ability: string | null;
  flavor_text: string | null;
  attacks: string[];
  prices: Price[];
}

export interface PriceHistoryPoint {
  date: string;
  source: PriceSource;
  currency: Currency;
  condition: string | null;
  variant: string | null;
  avg: number;
  low: number;
  high: number;
  sale_count: number;
}

/**
 * Whether a sold comp describes this card alone.
 *
 * A variant and its base card can map to one source product page. When they
 * do, both serve the same sales, with titles describing whichever printing
 * the seller actually sold.
 *
 * - `exact` — the source page is mapped to this card and no other.
 * - `shared` — the page is shared, so this sale appears in another card's
 *   feed too and its title may describe that printing. Price the group, not
 *   the entity, or filter these out.
 * - `unknown` — collected before the source printing was recorded, so
 *   sharing cannot be determined.
 */
export type ListingAttribution = "exact" | "shared" | "unknown";

export interface EbayListing {
  id: number;
  title: string;
  price: number;
  grader: string | null;
  /**
   * Grades are strings, not numbers, and include halves ("9.5", "1.5"). A
   * filter of `grade: "9"` matches PSA 9 and not BGS 9.5.
   */
  grade: string | null;
  /** The printing this comp was collected under, e.g. "Holofoil". */
  variant: string | null;
  attribution: ListingAttribution;
  sold_at: string;
  /**
   * When we collected the sale, which is not when it sold. Collection runs
   * regularly bring in sales that are weeks old, so this is the field to
   * checkpoint on when polling `since` for new comps.
   */
  ingested_at: string;
  listing_url: string | null;
}

export interface CardmarketListing {
  id: number;
  article_id: number | null;
  price: number;
  variant: string;
  condition: string | null;
  seller: string | null;
  quantity: number | null;
  language: string | null;
  comment: string | null;
  updated_at: string;
  /**
   * Cardmarket's per-listing special attributes. Any of these being `true`
   * means the offer is real but does **not** contribute to the card's market
   * price: a signed and altered Near Mint copy at EUR 200 must not set the
   * Near Mint price of a card whose clean copies sell for EUR 3,800, and a
   * slab is priced for the slab rather than for the card.
   *
   * Because of that, the cheapest row returned by `cardmarket()` is not
   * necessarily the card's `market_price`. Filter these out before deriving a
   * price of your own — along with `opened`, and with any row whose
   * `sell_count` is `0`.
   */
  signed: boolean;
  altered: boolean;
  graded: boolean;
  /**
   * Slab details, named to match the graded eBay sale shape so "PSA 10"
   * renders the same way whichever source it came from. Null unless `graded`
   * is true, and possibly null even then — Cardmarket flags a slab without
   * always naming the grader, and these are read from free-text seller
   * comments.
   */
  grader: string | null;
  grade: string | null;
  /**
   * The offer's own seller says the item is not sealed — an opened wrapper, or
   * a display missing its shrink. Sealed products only; always `false` on a
   * card listing, where the distinction does not exist.
   *
   * Treated like `signed`/`altered`/`graded`: a real offer, excluded from the
   * market price. A Jungle booster pack whose every other offer sits between
   * EUR 799 and EUR 950 carries one at EUR 10.00 reading "Not Sealed (open,
   * just the booster)" — a real price for an opened pack, not a EUR 10 Jungle
   * booster pack.
   */
  opened: boolean;
  /**
   * The seller's completed sales, as Cardmarket reports them. This is why a
   * `market_price` can sit **above** the cheapest listing you can see: an
   * offer from a seller with no completed sales does not set a price.
   *
   * `null` is not zero. `null` means no count was recorded for this row; `0`
   * means Cardmarket reports the seller as having sold nothing. If you are
   * reimplementing the price rule, treat only `0` as disqualifying.
   */
  sell_count: number | null;
}

export interface TcgplayerListing {
  id: number;
  listing_id: number | null;
  printing: string;
  condition: string | null;
  language: string | null;
  price: number;
  shipping_price: number | null;
  seller_name: string | null;
  seller_id: string | null;
  seller_rating: number | null;
  seller_sales: string | null;
  quantity: number | null;
  listing_type: string | null;
  direct_seller: boolean | null;
  gold_seller: boolean | null;
  verified_seller: boolean | null;
  custom_title: string | null;
  /**
   * When this listing's own fields last changed. Not a freshness signal: an
   * offer live and unchanged for a month keeps a month-old value however
   * recently it was confirmed. Read `snapshot_at` for that.
   */
  updated_at: string;
  /**
   * When this product's listings were last confirmed against TCGplayer. The
   * same for every row in a response, since a snapshot replaces a product's
   * listings wholesale. Listings refresh daily, so a value well over a day
   * old means that product's last fetch did not succeed. Null if no
   * successful snapshot has been recorded.
   */
  snapshot_at: string | null;
}

export interface SealedSummary {
  id: number;
  tcg_player_id: number;
  name: string;
  image_url: string | null;
  set: SetRef;
}

export interface Sealed extends SealedSummary {
  cardmarket_url: string | null;
  cardmarket_product_id: number | null;
  prices: Price[];
}

export type HealthStatus = "healthy" | "degraded" | "unreachable";

export interface Health {
  status: HealthStatus;
  database: string;
}

export interface ListSetsParams extends PageParams {
  name?: string;
  language?: string;
}

export type CardSort = "price_asc" | "price_desc";

export interface ListCardsParams extends PageParams {
  name?: string;
  set_id?: number;
  tcg_player_id?: number;
  number?: string;
  total_set_number?: string;
  rarity?: string;
  stage?: string;
  card_type?: string;
  weakness?: string;
  energy_type?: string;
  language?: string;
  currency?: CurrencyFilter;
  condition?: string;
  variant?: string;
  grade?: string;
  min_price?: number;
  max_price?: number;
  sort?: CardSort;
}

export interface GetCardParams {
  currency?: CurrencyFilter;
}

export interface PriceHistoryParams {
  period?: string;
  currency?: CurrencyFilter;
  limit?: number;
  page?: number;
}

export type ListingSort = "date_desc" | "date_asc" | "price_asc" | "price_desc";

/**
 * Only comps ingested after this instant. An RFC 3339 timestamp, or
 * `YYYY-MM-DD` for midnight UTC. The bound is exclusive, so the
 * `ingested_at` of the newest row you hold can go straight back in.
 *
 * Filters on ingestion, not on sale date: a sale-date bound would
 * permanently step over comps that arrive back-dated. A malformed value is
 * rejected rather than ignored.
 */
type SinceParam = { since?: string };

export interface EbayListingsParams extends CursorParams, SinceParam {
  /**
   * `true` returns every comp with grading information, `false` returns
   * every comp without it. The two are exact complements.
   */
  graded?: boolean;
  grader?: string;
  grade?: string;
  min_price?: number;
  max_price?: number;
  /** Restrict to one printing, e.g. "Holofoil". */
  variant?: string;
  sort?: ListingSort;
}

/**
 * Sealed eBay sales are never graded, so the grading filters don't apply.
 * Sealed products map one source page each with no printing to distinguish,
 * so there is no `variant` filter either.
 */
export interface SealedEbayListingsParams extends CursorParams, SinceParam {
  min_price?: number;
  max_price?: number;
  sort?: ListingSort;
}

export type MarketplaceSort = "price_asc" | "price_desc";

export interface CardmarketListingsParams extends CursorParams {
  condition?: string;
  /** "Reverse Holo" and "Reverse Holofoil" are equivalent. */
  variant?: string;
  min_price?: number;
  max_price?: number;
  sort?: MarketplaceSort;
}

/**
 * Sealed products take no `variant`: every sealed Cardmarket row is written
 * with an empty variant, so the filter could only ever exclude everything.
 */
export interface SealedCardmarketListingsParams extends CursorParams {
  condition?: string;
  min_price?: number;
  max_price?: number;
  sort?: MarketplaceSort;
}

export type TcgplayerSort = MarketplaceSort;

export interface TcgplayerListingsParams extends CursorParams {
  condition?: string;
  language?: string;
  printing?: string;
  min_price?: number;
  max_price?: number;
  sort?: TcgplayerSort;
}

export interface ListSealedParams extends PageParams {
  set_id?: number;
  name?: string;
  language?: string;
  currency?: CurrencyFilter;
  min_price?: number;
  max_price?: number;
  sort?: CardSort;
}

export interface GetSealedParams {
  currency?: CurrencyFilter;
}
