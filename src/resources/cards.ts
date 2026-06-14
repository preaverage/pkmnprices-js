import type { HttpClient } from "../http.js";
import { collect, iterateCursor, iteratePages } from "../pagination.js";
import type {
  Card,
  CardmarketListing,
  CardmarketListingsParams,
  CardSummary,
  CursorPaginated,
  EbayListing,
  EbayListingsParams,
  GetCardParams,
  ListCardsParams,
  Paginated,
  PriceHistoryParams,
  PriceHistoryPoint,
} from "../types.js";

// Sold eBay sales and live Cardmarket offers for a card.
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
}

export class CardsResource {
  readonly listings: CardListingsResource;

  constructor(private readonly http: HttpClient) {
    this.listings = new CardListingsResource(http);
  }

  // List results don't include prices. Use get() for a card's prices.
  list(params?: ListCardsParams): Promise<Paginated<CardSummary>> {
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
    return iteratePages(
      (page) => this.list({ ...params, page }),
      params?.page ?? 1
    );
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
}
