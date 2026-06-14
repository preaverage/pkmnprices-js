import type { HttpClient } from "../http.js";
import { collect, iterateCursor, iteratePages } from "../pagination.js";
import type {
  CursorPaginated,
  ListSealedParams,
  Paginated,
  PriceHistoryParams,
  PriceHistoryPoint,
  Sealed,
  SealedEbayListing,
  SealedListingsParams,
  SealedSummary,
} from "../types.js";

// Sealed products like booster boxes and ETBs. Pro plan and up.
export class SealedResource {
  constructor(private readonly http: HttpClient) {}

  // List results don't include prices. Use get() for a product's prices.
  list(params?: ListSealedParams): Promise<Paginated<SealedSummary>> {
    return this.http.request({
      path: "/v1/sealed",
      query: { ...params },
      auth: "apiKey",
    });
  }

  get(id: number): Promise<Sealed> {
    return this.http.request({ path: `/v1/sealed/${id}`, auth: "apiKey" });
  }

  iterate(params?: ListSealedParams): AsyncGenerator<SealedSummary> {
    return iteratePages(
      (page) => this.list({ ...params, page }),
      params?.page ?? 1
    );
  }

  listAll(params?: ListSealedParams): Promise<SealedSummary[]> {
    return collect(this.iterate(params));
  }

  priceHistory(
    id: number,
    params?: PriceHistoryParams
  ): Promise<Paginated<PriceHistoryPoint>> {
    return this.http.request({
      path: `/v1/sealed/${id}/prices/history`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iteratePriceHistory(
    id: number,
    params?: PriceHistoryParams
  ): AsyncGenerator<PriceHistoryPoint> {
    return iteratePages(
      (page) => this.priceHistory(id, { ...params, page }),
      params?.page ?? 1
    );
  }

  // Sold eBay listings, New condition only.
  listings(
    id: number,
    params?: SealedListingsParams
  ): Promise<CursorPaginated<SealedEbayListing>> {
    return this.http.request({
      path: `/v1/sealed/${id}/listings`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterateListings(
    id: number,
    params?: SealedListingsParams
  ): AsyncGenerator<SealedEbayListing> {
    return iterateCursor((cursor) =>
      this.listings(id, { ...params, cursor })
    );
  }

  allListings(
    id: number,
    params?: SealedListingsParams
  ): Promise<SealedEbayListing[]> {
    return collect(this.iterateListings(id, params));
  }
}
