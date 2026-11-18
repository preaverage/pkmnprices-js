import { openExport } from "../export.js";
import type { HttpClient } from "../http.js";
import {
  collect,
  iterateCursor,
  iterateList,
  iteratePages,
} from "../pagination.js";
import type {
  Card,
  CardMarkers,
  CardmarketListing,
  CardmarketListingsParams,
  CardPopulation,
  CardsExport,
  CardSummary,
  CursorPaginated,
  EbayListing,
  EbayListingsParams,
  GetCardParams,
  ListCardsParams,
  ListPaginated,
  Paginated,
  PopulationParams,
  PriceHistoryParams,
  PriceHistoryPoint,
  SalesVolumeParams,
  SalesVolumePoint,
  TcgplayerListing,
  TcgplayerListingsParams,
} from "../types.js";

// Sold eBay sales and live Cardmarket/TCGplayer offers for a card.
class CardListingsResource {
  constructor(private readonly http: HttpClient) {}

  ebay(
    cardId: number,
    params?: EbayListingsParams
  ): Promise<CursorPaginated<EbayListing>> {
    return this.http.request({
      path: `/v1/cards/${cardId}/listings/ebay`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterateEbay(
    cardId: number,
    params?: EbayListingsParams
  ): AsyncGenerator<EbayListing> {
    return iterateCursor((cursor) => this.ebay(cardId, { ...params, cursor }));
  }

  allEbay(cardId: number, params?: EbayListingsParams): Promise<EbayListing[]> {
    return collect(this.iterateEbay(cardId, params));
  }

  cardmarket(
    cardId: number,
    params?: CardmarketListingsParams
  ): Promise<CursorPaginated<CardmarketListing>> {
    return this.http.request({
      path: `/v1/cards/${cardId}/listings/cardmarket`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterateCardmarket(
    cardId: number,
    params?: CardmarketListingsParams
  ): AsyncGenerator<CardmarketListing> {
    return iterateCursor((cursor) =>
      this.cardmarket(cardId, { ...params, cursor })
    );
  }

  allCardmarket(
    cardId: number,
    params?: CardmarketListingsParams
  ): Promise<CardmarketListing[]> {
    return collect(this.iterateCardmarket(cardId, params));
  }

  tcgplayer(
    cardId: number,
    params?: TcgplayerListingsParams
  ): Promise<CursorPaginated<TcgplayerListing>> {
    return this.http.request({
      path: `/v1/cards/${cardId}/listings/tcgplayer`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterateTcgplayer(
    cardId: number,
    params?: TcgplayerListingsParams
  ): AsyncGenerator<TcgplayerListing> {
    return iterateCursor((cursor) =>
      this.tcgplayer(cardId, { ...params, cursor })
    );
  }

  allTcgplayer(
    cardId: number,
    params?: TcgplayerListingsParams
  ): Promise<TcgplayerListing[]> {
    return collect(this.iterateTcgplayer(cardId, params));
  }
}

export class CardsResource {
  readonly listings: CardListingsResource;

  constructor(private readonly http: HttpClient) {
    this.listings = new CardListingsResource(http);
  }

  // List results don't include prices. Use get() for a card's prices.
  list(params?: ListCardsParams): Promise<ListPaginated<CardSummary>> {
    return this.http.request({
      path: "/v1/cards",
      query: { ...params },
      auth: "apiKey",
    });
  }

  get(id: number, params?: GetCardParams): Promise<Card> {
    return this.http.request({
      path: `/v1/cards/${id}`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterate(params?: ListCardsParams): AsyncGenerator<CardSummary> {
    return iterateList((pageParams) => this.list(pageParams), params);
  }

  listAll(params?: ListCardsParams): Promise<CardSummary[]> {
    return collect(this.iterate(params));
  }

  // Pro plan and up.
  priceHistory(
    id: number,
    params?: PriceHistoryParams
  ): Promise<Paginated<PriceHistoryPoint>> {
    return this.http.request({
      path: `/v1/cards/${id}/prices/history`,
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

  // Daily eBay sold-comp counts, newest day first. eBay only: TCGplayer and
  // Cardmarket sales are not recorded, so this is not total market volume.
  // Pro plan and up.
  salesVolume(
    id: number,
    params?: SalesVolumeParams
  ): Promise<Paginated<SalesVolumePoint>> {
    return this.http.request({
      path: `/v1/cards/${id}/sales/volume`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  iterateSalesVolume(
    id: number,
    params?: SalesVolumeParams
  ): AsyncGenerator<SalesVolumePoint> {
    return iteratePages(
      (page) => this.salesVolume(id, { ...params, page }),
      params?.page ?? 1
    );
  }

  // Graded population per variant, from the PSA, BGS, SGC and CGC reports.
  // One credit per request. Pro plan and up.
  population(id: number, params?: PopulationParams): Promise<CardPopulation> {
    return this.http.request({
      path: `/v1/cards/${id}/population`,
      query: { ...params },
      auth: "apiKey",
    });
  }

  // Every value the pattern, stamp, distribution and placement filters accept.
  markers(): Promise<CardMarkers> {
    return this.http.request({ path: "/v1/cards/markers", auth: "apiKey" });
  }

  // The whole price catalog as one gzipped CSV. Scale plan and up. Not
  // charged in credits, but limited to two downloads per UTC day, so it is
  // never retried automatically.
  export(): Promise<CardsExport> {
    return openExport(this.http, "/v1/export/cards");
  }
}
