import {
  ConnectionError,
  createApiError,
  PkmnPricesError,
  RateLimitError,
  type ApiErrorBody,
  type RateLimitInfo,
} from "./errors.js";

export type FetchLike = typeof fetch;

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue>;

export type AuthScheme = "apiKey";

export interface HttpClientConfig {
  baseUrl: string;
  apiKey?: string;
  fetch: FetchLike;
  maxRetries: number;
  timeoutMs: number;
}

export interface RequestSpec {
  method?: string;
  path: string;
  query?: QueryParams;
  auth?: AuthScheme;
  signal?: AbortSignal;
}

export const resolveFetch = (): FetchLike => {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error("No global fetch found. Needs Node 18+, a modern browser, Deno, Bun, or Workers.");
};

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 8000;

const buildQuery = (query: QueryParams | undefined): string => {
  if (!query) return "";

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
};

const parseNumberHeader = (value: string | null): number | null => {
  if (value === null) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseRateLimit = (headers: Headers): RateLimitInfo => ({
  creditsCharged: parseNumberHeader(headers.get("x-credits-charged")),
  creditsLimit: parseNumberHeader(headers.get("x-credits-limit")),
  rateLimit: parseNumberHeader(headers.get("x-rate-limit")),
  rateRemaining: parseNumberHeader(headers.get("x-rate-remaining")),
});

const parseRetryAfter = (headers: Headers): number | null => {
  const raw = headers.get("retry-after");
  if (raw === null) return null;

  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
};

const isErrorBody = (body: unknown): body is ApiErrorBody => {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "object"
  );
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ConnectionError("Request aborted", signal.reason));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new ConnectionError("Request aborted", signal?.reason));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
};

const backoffDelay = (attempt: number, retryAfterMs: number | null): number => {
  if (retryAfterMs !== null) return retryAfterMs;

  const exponential = BASE_BACKOFF_MS * 2 ** attempt;
  const jitter = exponential * 0.25 * Math.random();
  return Math.min(exponential + jitter, MAX_BACKOFF_MS);
};

export class HttpClient {
  constructor(private readonly config: HttpClientConfig) {}

  async request<T>(spec: RequestSpec): Promise<T> {
    const { maxRetries } = this.config;

    let attempt = 0;
    for (;;) {
      try {
        return await this.attempt<T>(spec);
      } catch (error) {
        const canRetry = attempt < maxRetries && this.isRetryable(error);
        if (!canRetry) throw error;

        const retryAfterMs =
          error instanceof PkmnPricesError ? error.retryAfterMs : null;

        await sleep(backoffDelay(attempt, retryAfterMs), spec.signal);
        attempt += 1;
      }
    }
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof ConnectionError) return true;
    if (error instanceof PkmnPricesError) return RETRYABLE_STATUS.has(error.status);

    return false;
  }

  private authHeader(_auth: AuthScheme): Record<string, string> {
    if (!this.config.apiKey) {
      throw new ConnectionError(
        "This endpoint requires an API key. Set apiKey in the client options."
      );
    }
    return { "x-api-key": this.config.apiKey };
  }

  private async attempt<T>(spec: RequestSpec): Promise<T> {
    const { baseUrl, fetch: fetchImpl, timeoutMs } = this.config;
    const url = `${baseUrl}${spec.path}${buildQuery(spec.query)}`;

    const headers: Record<string, string> = { accept: "application/json" };
    if (spec.auth) Object.assign(headers, this.authHeader(spec.auth));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = (): void => controller.abort(spec.signal?.reason);
    spec.signal?.addEventListener("abort", onExternalAbort, { once: true });

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: spec.method ?? "GET",
        headers,
        signal: controller.signal,
      });
    } catch (cause) {
      const wasTimeout = controller.signal.aborted && !spec.signal?.aborted;
      const message = wasTimeout
        ? `Request to ${spec.path} timed out after ${timeoutMs}ms`
        : `Request to ${spec.path} failed`;
      throw new ConnectionError(message, cause);
    } finally {
      clearTimeout(timeout);
      spec.signal?.removeEventListener("abort", onExternalAbort);
    }

    return this.parse<T>(response, spec);
  }

  private async parse<T>(response: Response, spec: RequestSpec): Promise<T> {
    const rateLimit = parseRateLimit(response.headers);
    const body = await this.readJson(response, spec);

    if (response.ok) return body as T;

    const code = isErrorBody(body) ? body.error.code : "unknown";
    const message = isErrorBody(body)
      ? body.error.message
      : `Request to ${spec.path} failed with status ${response.status}`;

    throw createApiError({
      status: response.status,
      code,
      message,
      rateLimit,
      retryAfterMs: parseRetryAfter(response.headers),
    });
  }

  private async readJson(response: Response, spec: RequestSpec): Promise<unknown> {
    const text = await response.text();
    if (!text) return undefined;

    try {
      return JSON.parse(text);
    } catch (cause) {
      if (response.ok) {
        throw new ConnectionError(
          `Failed to parse JSON response from ${spec.path}`,
          cause
        );
      }
      return undefined;
    }
  }
}
