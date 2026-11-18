import {
  ConnectionError,
  createApiError,
  PkmnPricesError,
  RateLimitError,
  type ApiErrorBody,
  type LimitType,
  type RateLimitInfo,
} from "./errors.js";

export type FetchLike = typeof fetch;

export type QueryValue =
  | string
  | number
  | boolean
  | readonly string[]
  | undefined
  | null;
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
  accept?: string;
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
    // List filters (seller_country, sale_type) are comma-separated on the wire.
    search.append(key, Array.isArray(value) ? value.join(",") : String(value));
  }

  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
};

export const parseNumberHeader = (value: string | null): number | null => {
  if (value === null) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseRateLimit = (headers: Headers): RateLimitInfo => ({
  creditsCharged: parseNumberHeader(headers.get("x-credits-charged")),
  creditsLimit: parseNumberHeader(headers.get("x-credits-limit")),
  creditsRemaining: parseNumberHeader(headers.get("x-credits-remaining")),
  creditsReset: parseNumberHeader(headers.get("x-credits-reset")),
  creditsBalance: parseNumberHeader(headers.get("x-credits-balance")),
  rateLimit: parseNumberHeader(headers.get("x-rate-limit")),
  rateRemaining: parseNumberHeader(headers.get("x-rate-remaining")),
  rateReset: parseNumberHeader(headers.get("x-rate-reset")),
});

// The header and the body's retry_after carry the same number; the body is
// the fallback for a proxy that strips the header.
const parseRetryAfterMs = (
  headers: Headers,
  bodySeconds: number | null | undefined
): number | null => {
  const seconds = parseNumberHeader(headers.get("retry-after")) ?? bodySeconds;
  return typeof seconds === "number" ? seconds * 1000 : null;
};

const parseLimitType = (value: unknown): LimitType | null =>
  value === "per_minute" || value === "daily" ? value : null;

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

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
        return await this.send(spec, (response) =>
          this.parseJson<T>(response, spec)
        );
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

  // For bodies the caller reads as a stream. One attempt and no retries,
  // because a retried download can spend a daily download allowance twice.
  // The timeout covers the wait for headers only; the body has no deadline.
  stream(spec: RequestSpec): Promise<Response> {
    return this.send(spec, async (response) => {
      if (!response.ok) await this.throwApiError(response, spec);

      return response;
    });
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

  // `handle` runs inside the timeout and abort wiring, so a connection that
  // stalls or is aborted mid-body fails the same way one that never answers
  // does.
  private async send<T>(
    spec: RequestSpec,
    handle: (response: Response) => Promise<T>
  ): Promise<T> {
    const { baseUrl, fetch: fetchImpl, timeoutMs } = this.config;
    const url = `${baseUrl}${spec.path}${buildQuery(spec.query)}`;

    const headers: Record<string, string> = { accept: spec.accept ?? "application/json" };
    if (spec.auth) Object.assign(headers, this.authHeader(spec.auth));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = (): void => controller.abort(spec.signal?.reason);
    spec.signal?.addEventListener("abort", onExternalAbort, { once: true });

    try {
      const response = await fetchImpl(url, {
        method: spec.method ?? "GET",
        headers,
        signal: controller.signal,
      });

      return await handle(response);
    } catch (cause) {
      if (cause instanceof PkmnPricesError) throw cause;

      const wasTimeout = controller.signal.aborted && !spec.signal?.aborted;
      const message = wasTimeout
        ? `Request to ${spec.path} timed out after ${timeoutMs}ms`
        : `Request to ${spec.path} failed`;
      throw new ConnectionError(message, cause);
    } finally {
      clearTimeout(timeout);
      spec.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  private async parseJson<T>(response: Response, spec: RequestSpec): Promise<T> {
    if (!response.ok) await this.throwApiError(response, spec);

    const text = await response.text();
    if (!text) return undefined as T;

    try {
      return JSON.parse(text) as T;
    } catch (cause) {
      throw new ConnectionError(
        `Failed to parse JSON response from ${spec.path}`,
        cause
      );
    }
  }

  private async throwApiError(response: Response, spec: RequestSpec): Promise<never> {
    const body = await this.readErrorBody(response);
    const detail = isErrorBody(body) ? body.error : null;

    throw createApiError({
      status: response.status,
      code: detail?.code ?? "unknown",
      message:
        detail?.message ??
        `Request to ${spec.path} failed with status ${response.status}`,
      docsUrl: stringOrNull(detail?.docs_url),
      rateLimit: parseRateLimit(response.headers),
      retryAfterMs: parseRetryAfterMs(response.headers, detail?.retry_after),
      limitType: parseLimitType(detail?.limit_type),
      resetsAt: stringOrNull(detail?.resets_at),
      upgradeUrl: stringOrNull(detail?.upgrade_url),
    });
  }

  // An error from a proxy in front of the API may not be JSON at all.
  private async readErrorBody(response: Response): Promise<unknown> {
    try {
      return JSON.parse(await response.text());
    } catch {
      return undefined;
    }
  }
}
