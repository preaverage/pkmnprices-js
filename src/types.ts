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

export type EbaySaleType = "auction" | "buy_it_now" | string;

export interface EbayListing {
  id: number;
  ebay_listing_id: string;
  title: string;
  price: number;
  grader: string | null;
  grade: string | null;
  sale_type: EbaySaleType;
  sold_at: string;
  listing_url: string;
}

export interface CardmarketListing {
  id: number;
  article_id: number;
  price: number;
  variant: string | null;
  condition: string | null;
  seller: string;
  quantity: number;
  language: string | null;
  comment: string | null;
  updated_at: string;
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
  updated_at: string;
}

export interface SealedSummary {
  id: number;
  tcg_player_id: number;
  name: string;
  image_url: string | null;
  set: SetRef;
}

export interface Sealed extends SealedSummary {
  prices: Price[];
}

export interface SealedEbayListing {
  id: number;
  ebay_listing_id: string;
  title: string;
  price: number;
  sale_type: EbaySaleType;
  sold_at: string;
  listing_url: string;
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

export interface EbayListingsParams extends CursorParams {
  grader?: string;
  grade?: string;
  min_price?: number;
  max_price?: number;
  sort?: ListingSort;
}

export type CardmarketSort = "price_asc" | "price_desc";

export interface CardmarketListingsParams extends CursorParams {
  condition?: string;
  language?: string;
  variant?: string;
  min_price?: number;
  max_price?: number;
  sort?: CardmarketSort;
}

export type TcgplayerSort = "price_asc" | "price_desc";

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
  min_price?: number;
  max_price?: number;
  sort?: CardSort;
}

export interface SealedListingsParams extends CursorParams {
  min_price?: number;
  max_price?: number;
  sort?: ListingSort;
}
