export type Currency = "USD" | "EUR";

// Accepted on the wire case-insensitively.
export type CurrencyFilter = "usd" | "eur" | "USD" | "EUR";

/**
 * Where a market price comes from. eBay is not a price source: its sold comps
 * are individual sales, served by the eBay listings methods only.
 */
export type PriceSource = "tcgplayer" | "cardmarket";

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

/** Pagination on the set, card and sealed lists, which also page by keyset. */
export interface ListPageInfo extends PageInfo {
  /**
   * Pass as `cursor` to read the next page without an offset. Null on the
   * last page, and on price-sorted or price-filtered lists, which only page
   * by number.
   */
  next_cursor: string | null;
}

export interface ListPaginated<T> {
  data: T[];
  pagination: ListPageInfo;
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

export interface ListPageParams extends PageParams {
  /**
   * The previous response's `pagination.next_cursor`. Replaces `page`: send
   * one or the other. A cursor costs the same on page 500 as on page 1 and
   * cannot repeat or skip a row added mid-walk. Refused with a 400 on lists
   * filtered or sorted by price.
   */
  cursor?: string;
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
  /** Null for sets with no TCGplayer group, e.g. German and Spanish sets. */
  tcg_player_id: number | null;
  name: string;
  language: string;
  card_count: number | null;
}

export interface Price {
  source: PriceSource;
  currency: Currency;
  condition: string | null;
  variant: string | null;
  /** Current price for this exact source, condition, and variant. */
  market_price: number | null;
  created_at: string;
}

export interface CardSummary {
  id: number;
  /** Null for cards with no TCGplayer product, e.g. German and Spanish cards. */
  tcg_player_id: number | null;
  name: string;
  image_url: string | null;
  number: string | null;
  total_set_number: string | null;
  rarity: string | null;
  /** Foil pattern of this printing, e.g. "Poke Ball Pattern", "Cosmos Holo". */
  pattern: string | null;
  /** Stamp or promotional release, e.g. "GYM", "Costco Exclusive". */
  stamp: string | null;
  /** Number printed inside the stamp (Battle Academy decks), e.g. "15". */
  stamp_number: string | null;
  /** How this copy was handed out, e.g. "Staff". */
  distribution: string | null;
  /** Result a prize copy was awarded for, e.g. "1st Place", "Top 16". */
  placement: string | null;
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

export interface MarkerCount {
  /** The value as it appears on cards and as the filter expects it. */
  value: string;
  cards: number;
}

/**
 * Every value the `pattern`, `stamp`, `distribution` and `placement` card
 * filters accept, most common first.
 */
export interface CardMarkers {
  patterns: MarkerCount[];
  stamps: MarkerCount[];
  distributions: MarkerCount[];
  placements: MarkerCount[];
}

export interface PriceHistoryPoint {
  date: string;
  source: PriceSource;
  currency: Currency;
  condition: string | null;
  variant: string | null;
  avg: number | null;
  low: number | null;
  high: number | null;
}

/** One day of eBay sold comps for a card, per currency, variant and graded. */
export interface SalesVolumePoint {
  date: string;
  currency: Currency;
  /**
   * Printing the sales were filed under. Null when the listing title did not
   * narrow the sale to one printing; keep that bucket apart from named ones.
   */
  variant: string | null;
  /** A slab (a grader or grade is recorded) as against a raw card. */
  graded: boolean;
  /** Sold comps that day, every one of them. */
  sales: number;
  /**
   * Sales that went into `median`: all of them except accepted Best Offers,
   * whose listed price can differ from what the buyer paid.
   */
  priced_sales: number;
  median: number | null;
}

/** One grader's counts for one printing. */
export interface GraderPopulation {
  total: number;
  /** Copies at this grader's gem grade or higher. */
  gems: number;
  /** `gems` as a percentage of `total`, two decimals. */
  gem_rate: number;
  /**
   * Copies at each numeric grade. Keys are "1" to "10" with halves as "8.5".
   * BGS has no plain "10", only `pristine` and `black_label`.
   */
  grades: Record<string, number>;
  /** 10 Pristine. Null for a grader that does not issue it (PSA). */
  pristine: number | null;
  /** BGS Black Label or CGC Perfect 10. Null for a grader with neither. */
  black_label: number | null;
  authentic: number;
  /** CGC's "Authentic Altered". Null for the other graders. */
  altered: number | null;
  /** Copies graded with a qualifier (PSA's OC, MK, ST and so on). */
  qualified: number;
  /** The last day this grader's count changed, as `YYYY-MM-DD`. */
  last_population_change: string | null;
  /** The grader's own population report page for the set. */
  pop_report_url: string | null;
  /** PSA's spec number for the card. Null for other graders. */
  spec_id: string | null;
  /** How the grader names the card in its own report. */
  description: string;
}

/** How many copies of one printing PSA, BGS, SGC and CGC have graded. */
export interface VariantPopulation {
  /** The variant as it appears in price rows, e.g. "Reverse Holofoil". */
  variant: string;
  /** Every graded copy across all graders, authentic and qualified included. */
  total_population: number;
  /** Copies at each grader's gem grade or higher: PSA 10, BGS 9.5 and up. */
  total_gems: number;
  /**
   * `total_gems` as a percentage of `total_population`, two decimals. Null
   * when nothing has been graded.
   */
  gem_rate: number | null;
  /**
   * Copies at each numeric grade, summed across graders. Keys are "1" to
   * "10" with halves as "8.5". A grade nobody issued is absent, not zero.
   */
  grades: Record<string, number>;
  /** 10 Pristine across BGS, CGC and SGC. Above a plain 10, not in `grades`. */
  pristine: number;
  /** BGS Black Label and CGC Perfect 10, summed. Above Pristine. */
  black_label: number;
  /** Graded authentic without a numeric grade. */
  authentic: number;
  /**
   * For each key in `grades`, the percentage of numerically graded copies
   * that graded higher. `percent_higher["8.5"]` is the share that came back a
   * 9 or better, the usual input to a grading ROI estimate.
   */
  percent_higher: Record<string, number>;
  /**
   * Each grader's own counts, keyed "PSA", "BGS", "SGC", "CGC". A grader
   * with no copies of this printing on record is absent.
   */
  graders: Record<string, GraderPopulation>;
  /** The last day any grader's count changed, as `YYYY-MM-DD`. */
  last_population_change: string | null;
  /** When these counts were last refreshed. */
  updated_at: string;
}

/**
 * Graded populations for one card. A variant that could not be tied to
 * population records is left out, so `variants` can be shorter than the
 * card's variant list, or empty. An empty list is not a population of zero.
 */
export interface CardPopulation {
  card_id: number;
  variants: VariantPopulation[];
}

/**
 * Whether a sold comp describes this card alone.
 *
 * A variant and its base card can map to one source product page. When they
 * do, both serve the same sales, with titles describing whichever printing
 * the seller actually sold.
 *
 * - `exact`: the source page is mapped to this card and no other.
 * - `shared`: the page is shared, so this sale appears in another card's
 *   feed too and its title may describe that printing. Price the group, not
 *   the entity, or filter these out.
 * - `unknown`: no printing is recorded for this comp, so sharing cannot be
 *   determined. Either it was collected before printings were recorded, or
 *   its title did not narrow the sale to one printing.
 */
export type ListingAttribution = "exact" | "shared" | "unknown";

/**
 * How an eBay comp sold. `fixed_price` includes listings that allowed offers
 * but sold at the listed price. For `best_offer_accepted`, `price` is the
 * amount the buyer paid.
 */
export type SaleType = "auction" | "fixed_price" | "best_offer_accepted";

export interface EbayListing {
  id: number;
  title: string;
  price: number;
  /**
   * The currency of `price`, per comp: USD for ebay.com, EUR for German and
   * Spanish card comps from ebay.de and ebay.es. Sealed comps are always USD.
   */
  currency: Currency;
  /**
   * The seller's location as an uppercase ISO 3166-1 alpha-2 code, such as
   * "US" or "JP". Puerto Rico is "PR". Null when the location is unknown,
   * which covers older comps, some comps mirrored from PriceCharting, and
   * locations that don't match a country. Always null on sealed comps.
   */
  seller_country: string | null;
  /**
   * Null for comps collected before the field existed, comps mirrored from
   * PriceCharting, and sealed comps. Older accepted offers can still carry
   * the list price in `price` with nothing marking them, so pass every
   * `sale_type` value as a filter to leave the null rows out.
   */
  sale_type: SaleType | null;
  grader: string | null;
  /**
   * Grades are strings, not numbers, and include halves ("9.5", "1.5"). A
   * filter of `grade: "9"` matches PSA 9 and not BGS 9.5.
   */
  grade: string | null;
  /**
   * Which tier of `grade` this is, when the grader issues more than one at
   * that number: "Pristine" for a CGC 10 that is not a Gem Mint, "Black
   * Label" for a BGS 10 that is not a plain 10. A Pristine ten sells well
   * above a Gem Mint ten, so a population that mixes them prices neither.
   * Null for the tier with no name of its own, which is nearly every comp,
   * and for comps collected before the tier was recorded. `grade: "10"`
   * still matches every tier; split them by reading this, or filter with
   * the `grade_qualifier` param.
   */
  grade_qualifier: string | null;
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
  /**
   * When a field of this comp last changed after it went in: a corrected
   * grade, price, sale type, printing or title, or a move to the card it was
   * for. Null when nothing has changed since corrections began being
   * recorded on 2026-10-20, and on every sealed comp. A correction never
   * moves `ingested_at`, so a `since` poll does not return it. Poll
   * `updated_since` and replace your copy by `id`.
   */
  updated_at: string | null;
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
   * price of your own, along with `opened` and any row whose `sell_count` is
   * `0`. The `graded`, `signed`, `altered` and `opened` params do it
   * server-side.
   */
  signed: boolean;
  altered: boolean;
  graded: boolean;
  /**
   * Slab details, named to match the graded eBay sale shape so "PSA 10"
   * renders the same way whichever source it came from. Null unless `graded`
   * is true, and possibly null even then: Cardmarket flags a slab without
   * always naming the grader, and these are read from free-text seller
   * comments.
   */
  grader: string | null;
  grade: string | null;
  /**
   * The offer's own seller says the item is not sealed: an opened wrapper, or
   * a display missing its shrink. Sealed products only; always `false` on a
   * card listing, where the distinction does not exist.
   *
   * Treated like `signed`/`altered`/`graded`: a real offer, excluded from the
   * market price. A Jungle booster pack whose every other offer sits between
   * EUR 799 and EUR 950 carries one at EUR 10.00 reading "Not Sealed (open,
   * just the booster)". That is a real price for an opened pack, not a EUR 10
   * Jungle booster pack.
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
  /**
   * The seller's location as an uppercase ISO 3166-1 alpha-2 code, such as
   * "IT" or "DE", read from the offer's item-location flag. Same meaning as
   * `seller_country` on eBay comps. Null for offers scraped before the field
   * existed, offers that show no location, and unmatched countries.
   */
  seller_country: string | null;
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
  tcg_player_id: number | null;
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
  /** Server time this check ran. Tells a live response from a cached one. */
  timestamp: string;
  /** Deployed API version. */
  version: string;
}

/**
 * The whole price catalog as one gzipped CSV. One row per card, currency,
 * condition and variant, with the current raw market price.
 */
export interface CardsExport {
  /** The gzip bytes, streamed as the server produces them. */
  body: ReadableStream<Uint8Array>;
  /** Suggested filename, e.g. "pkmnprices-cards-2026-10-26.csv.gz". */
  filename: string | null;
  /** Downloads left today. Each account gets two per UTC day. */
  downloadsRemaining: number | null;
  /** Reads `body` to the end. The file is large; prefer the stream. */
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface ListSetsParams extends ListPageParams {
  name?: string;
  language?: string;
}

export type CardSort = "price_asc" | "price_desc";

export interface ListCardsParams extends ListPageParams {
  /** Substring match. */
  name?: string;
  set_id?: number;
  tcg_player_id?: number;
  /** Leading zeros are ignored, so "54" finds "054". */
  number?: string;
  total_set_number?: string;
  /** Matched exactly as spelled in responses, e.g. "Double Rare". */
  rarity?: string;
  /**
   * The four marker filters match exactly as spelled in responses.
   * `cards.markers()` lists every value they accept.
   */
  pattern?: string;
  stamp?: string;
  distribution?: string;
  placement?: string;
  stage?: string;
  card_type?: string;
  weakness?: string;
  energy_type?: string;
  /** Case-insensitive substring match on the illustrator's name. */
  artist?: string;
  /** Exact HP. */
  hp?: number;
  language?: string;
  currency?: CurrencyFilter;
  condition?: string;
  variant?: string;
  grader?: string;
  grade?: string;
  min_price?: number;
  max_price?: number;
  sort?: CardSort;
}

export interface GetCardParams {
  currency?: CurrencyFilter;
}

export interface PriceHistoryParams {
  /** Window in days, 1 to 365, as "90d" or "90". Default "30d". */
  period?: string;
  currency?: CurrencyFilter;
  /** Rows per page, not days. Default 30, max 365. */
  limit?: number;
  page?: number;
  /** Exact match, e.g. "Near Mint" (TCGplayer) or "Excellent" (Cardmarket). */
  condition?: string;
  /** Exact match, e.g. "Holofoil". */
  variant?: string;
}

export interface SalesVolumeParams {
  /** Window in days, 1 to 365, as "90d" or "90". Default "30d". */
  period?: string;
  currency?: CurrencyFilter;
  /** Exact match, e.g. "Holofoil". */
  variant?: string;
  /** `true` for graded slabs only, `false` for raw cards only. */
  graded?: boolean;
  /** Rows per page, not days. Default 30, max 365. */
  limit?: number;
  page?: number;
}

export interface PopulationParams {
  /** Only this variant, spelled as in price rows, e.g. "Reverse Holofoil". */
  variant?: string;
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

/**
 * Only comps sold in the last N days, as "90d" or "90" (1 to 365). Bounds
 * `sold_at`, where `since` bounds `ingested_at`. Use it for pricing, not for
 * syncing: comps often arrive days after the sale, so a poll on `period`
 * would miss the late ones.
 */
type SoldPeriodParam = { period?: string };

/**
 * Seller country filters, as ISO 3166-1 alpha-2 codes. Pass a
 * comma-separated string ("US,JP") or an array; case doesn't matter, and the
 * API takes at most 30 codes. A malformed code is a 400.
 *
 * `seller_country` leaves out rows whose seller country is unknown;
 * `exclude_seller_country` keeps them.
 */
type SellerCountryParams = {
  seller_country?: string | string[];
  exclude_seller_country?: string | string[];
};

/**
 * `pristine` is a CGC Pristine 10, `black_label` a BGS Black Label 10, and
 * `none` the tier with no name of its own (a plain CGC or BGS 10, and every
 * other grade). `none` also returns comps whose tier was never recorded.
 */
export type GradeQualifierFilter = "pristine" | "black_label" | "none";

export interface EbayListingsParams
  extends CursorParams,
    SinceParam,
    SoldPeriodParam,
    SellerCountryParams {
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
  /** `grade: "10", grade_qualifier: "none"` returns plain tens only. */
  grade_qualifier?: GradeQualifierFilter;
  /**
   * Only comps that sold one of these ways. Comps with no known sale type
   * are left out, so passing all three keeps every comp whose sale type is
   * known.
   */
  sale_type?: SaleType | SaleType[];
  /**
   * Only comps corrected after this instant, in the same format as `since`.
   * Bounds `updated_at`. If you keep a copy of comps, poll this alongside
   * `since` and replace rows by `id`.
   */
  updated_since?: string;
  sort?: ListingSort;
}

/**
 * Sealed eBay sales are never graded, so the grading filters don't apply.
 * Sealed products map one source page each with no printing to distinguish,
 * so there is no `variant` filter either.
 */
export interface SealedEbayListingsParams
  extends CursorParams,
    SinceParam,
    SoldPeriodParam {
  min_price?: number;
  max_price?: number;
  sort?: ListingSort;
}

export type MarketplaceSort = "price_asc" | "price_desc";

/**
 * The filters that drop offers which are real but do not set a market price.
 * `graded: false, signed: false, altered: false` leaves clean raw copies.
 */
type CardmarketAttributeParams = {
  /** `true` for graded offers only, `false` for raw offers only. */
  graded?: boolean;
  /** Only graded offers from this grader, e.g. "PSA". Case-insensitive. */
  grader?: string;
  /** Only graded offers at this grade, e.g. "10" or "9.5". */
  grade?: string;
  /** `true` for signed offers only, `false` to leave signed offers out. */
  signed?: boolean;
  /** `true` for altered offers only, `false` to leave altered offers out. */
  altered?: boolean;
  /**
   * Only offers from sellers with at least this many completed sales. Offers
   * with no recorded `sell_count` are left out.
   */
  min_sell_count?: number;
};

export interface CardmarketListingsParams
  extends CursorParams,
    SellerCountryParams,
    CardmarketAttributeParams {
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
export interface SealedCardmarketListingsParams
  extends CursorParams,
    SellerCountryParams,
    CardmarketAttributeParams {
  condition?: string;
  min_price?: number;
  max_price?: number;
  /**
   * `true` for offers whose seller says the product is not sealed, `false`
   * to leave those out.
   */
  opened?: boolean;
  sort?: MarketplaceSort;
}

/**
 * TCGplayer offers carry a shipping price, so they can be ordered by what a
 * buyer actually pays. `price_asc` / `price_desc` order by item price alone.
 * `total_asc` / `total_desc` order by `price + shipping_price`, which is how
 * TCGplayer's own site orders offers and the order the snapshot was
 * collected in, so `total_asc` puts the true cheapest offer first.
 *
 * A cursor is bound to the sort family it was issued under: a `total_*`
 * cursor replayed under a `price_*` sort (or the reverse) is a 400.
 * `min_price` / `max_price` filter item price under every sort.
 */
export type TcgplayerSort = MarketplaceSort | "total_asc" | "total_desc";

export interface TcgplayerListingsParams extends CursorParams {
  condition?: string;
  language?: string;
  printing?: string;
  min_price?: number;
  max_price?: number;
  sort?: TcgplayerSort;
}

export interface ListSealedParams extends ListPageParams {
  set_id?: number;
  tcg_player_id?: number;
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
