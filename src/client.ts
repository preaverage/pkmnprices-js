import { HttpClient, resolveFetch } from "./http.js";
import { CardsResource } from "./resources/cards.js";
import { SealedResource } from "./resources/sealed.js";
import { SetsResource } from "./resources/sets.js";
import type { Health } from "./types.js";

// Request paths carry their own /v1 prefix, and /health has none, so this is the origin only.
const BASE_URL = "https://api.pkmnprices.com";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 30_000;

export interface PkmnPricesOptions {
  apiKey?: string;
  // Retries on 429 rate limits and transient 5xx/network errors. Default 2.
  maxRetries?: number;
  // Per-request timeout in ms. Default 30000.
  timeoutMs?: number;
}

export class PkmnPrices {
  readonly sets: SetsResource;
  readonly cards: CardsResource;
  readonly sealed: SealedResource;

  private readonly http: HttpClient;

  constructor(options: PkmnPricesOptions = {}) {
    this.http = new HttpClient({
      baseUrl: BASE_URL,
      apiKey: options.apiKey,
      fetch: resolveFetch(),
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });

    this.sets = new SetsResource(this.http);
    this.cards = new CardsResource(this.http);
    this.sealed = new SealedResource(this.http);
  }

  // No auth required.
  health(): Promise<Health> {
    return this.http.request({ path: "/health" });
  }
}
