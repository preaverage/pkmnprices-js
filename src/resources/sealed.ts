import type { HttpClient } from "../http.js";
import { collect, iterateCursor, iteratePages } from "../pagination.js";
import type {
  CursorPaginated,
  EbayListing,
  GetSealedParams,
  ListSealedParams,
  Paginated,
  PriceHistoryParams,
  PriceHistoryPoint,
  Sealed,
  SealedEbayListingsParams,
  SealedSummary,
  TcgplayerListing,
  TcgplayerListingsParams,
} from "../types.js";

// Sold eBay sales and live TCGplayer offers for a sealed product.
class SealedListingsResource {
  constructor(private readonly http: HttpClient) {}

  ebay(
    sealedId: number,
    params?: SealedEbayListingsParams
  ): Promise<CursorPaginated<EbayListing>> {
    return this.http.request({
      path: `/v1/sealed/${sealedId}/listings/ebay`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterateEbay(
    sealedId: number,
    params?: SealedEbayListingsParams
  ): AsyncGenerator<EbayListing> {
    return iterateCursor((cursor) => this.ebay(sealedId, { ...params, cursor }));
  }

  allEbay(
    sealedId: number,
    params?: SealedEbayListingsParams
  ): Promise<EbayListing[]> {
    return collect(this.iterateEbay(sealedId, params));
  }

  // Sealed offers are normally condition "Unopened" with an empty printing, so
  // the condition and printing filters rarely narrow anything here.
  tcgplayer(
    sealedId: number,
    params?: TcgplayerListingsParams
  ): Promise<CursorPaginated<TcgplayerListing>> {
    return this.http.request({
      path: `/v1/sealed/${sealedId}/listings/tcgplayer`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterateTcgplayer(
    sealedId: number,
    params?: TcgplayerListingsParams
  ): AsyncGenerator<TcgplayerListing> {
    return iterateCursor((cursor) =>
      this.tcgplayer(sealedId, { ...params, cursor })
    );
  }

  allTcgplayer(
    sealedId: number,
    params?: TcgplayerListingsParams
  ): Promise<TcgplayerListing[]> {
    return collect(this.iterateTcgplayer(sealedId, params));
  }
}

// Sealed products like booster boxes and ETBs. Pro plan and up.
export class SealedResource {
  readonly listings: SealedListingsResource;

  constructor(private readonly http: HttpClient) {
    this.listings = new SealedListingsResource(http);
  }

  // List results don't include prices. Use get() for a product's prices.
  list(params?: ListSealedParams): Promise<Paginated<SealedSummary>> {
    return this.http.request({
      path: "/v1/sealed",
      query: { ...params },
      auth: "apiKey",
    });
  }

  get(id: number, params?: GetSealedParams): Promise<Sealed> {
    return this.http.request({
      path: `/v1/sealed/${id}`,
      query: { ...params },
      auth: "apiKey",
    });
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
}
