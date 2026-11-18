export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "missing_api_key"
  | "invalid_api_key"
  | "forbidden"
  | "email_unverified"
  | "not_found"
  | "conflict"
  | "credit_limit_exceeded"
  | "rate_limit_exceeded"
  | "internal_error";

/**
 * Which limit a 429 hit. They clear on different clocks: `per_minute` within
 * 60 seconds, `daily` not until 00:00 UTC.
 */
export type LimitType = "per_minute" | "daily";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Documentation for this class of error. */
    docs_url?: string;
    /** On a 429 only. */
    limit_type?: string | null;
    /** On a 429 only: whole seconds until a retry can succeed. */
    retry_after?: number | null;
    /** On a 429 only: when that wait ends, RFC 3339 in UTC. */
    resets_at?: string | null;
    /** On a daily-limit 429 only. */
    upgrade_url?: string | null;
  };
}

/** Credit and rate-limit metadata parsed from response headers. */
export interface RateLimitInfo {
  creditsCharged: number | null;
  /** The plan's daily allowance. */
  creditsLimit: number | null;
  /** Credits left in today's allowance after this request. */
  creditsRemaining: number | null;
  /** Seconds until the allowance refills at 00:00 UTC. */
  creditsReset: number | null;
  /** Prepaid credits left. Sent only while the account holds a balance. */
  creditsBalance: number | null;
  rateLimit: number | null;
  rateRemaining: number | null;
  /** Seconds until the per-minute window closes. */
  rateReset: number | null;
}

export const EMPTY_RATE_LIMIT: RateLimitInfo = {
  creditsCharged: null,
  creditsLimit: null,
  creditsRemaining: null,
  creditsReset: null,
  creditsBalance: null,
  rateLimit: null,
  rateRemaining: null,
  rateReset: null,
};

export interface PkmnPricesErrorInit {
  status: number;
  code: string;
  message: string;
  docsUrl: string | null;
  rateLimit: RateLimitInfo;
  retryAfterMs: number | null;
  limitType?: LimitType | null;
  resetsAt?: string | null;
  upgradeUrl?: string | null;
}

/** Base class for every error surfaced by the SDK. */
export class PkmnPricesError extends Error {
  readonly status: number;
  readonly code: string;
  /**
   * The docs page for this class of error, as sent by the API: a 401 points
   * at authentication, a 403 at pricing, a 429 at rate limits. Null when the
   * response carried no body to read it from.
   */
  readonly docsUrl: string | null;
  readonly rateLimit: RateLimitInfo;
  readonly retryAfterMs: number | null;
  /** Set on a 429. Null on every other error. */
  readonly limitType: LimitType | null;
  /** On a 429, when the wait ends, RFC 3339 in UTC. */
  readonly resetsAt: string | null;
  /**
   * On a daily-limit 429, the dashboard page for moving up a plan or adding
   * prepaid credits.
   */
  readonly upgradeUrl: string | null;

  constructor(init: PkmnPricesErrorInit) {
    super(init.message);
    this.name = new.target.name;
    this.status = init.status;
    this.code = init.code;
    this.docsUrl = init.docsUrl;
    this.rateLimit = init.rateLimit;
    this.retryAfterMs = init.retryAfterMs;
    this.limitType = init.limitType ?? null;
    this.resetsAt = init.resetsAt ?? null;
    this.upgradeUrl = init.upgradeUrl ?? null;
  }
}

export class BadRequestError extends PkmnPricesError {}
export class UnauthorizedError extends PkmnPricesError {}
export class ForbiddenError extends PkmnPricesError {}
export class NotFoundError extends PkmnPricesError {}
export class ConflictError extends PkmnPricesError {}
export class CreditLimitError extends PkmnPricesError {}
export class RateLimitError extends PkmnPricesError {}
export class InternalServerError extends PkmnPricesError {}

// Network failure, timeout, or a body that wasn't JSON. No HTTP status to map.
export class ConnectionError extends PkmnPricesError {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super({
      status: 0,
      code: "connection_error",
      message,
      docsUrl: null,
      rateLimit: EMPTY_RATE_LIMIT,
      retryAfterMs: null,
    });
    this.cause = cause;
  }
}

const isCreditLimit = (status: number, code: string): boolean =>
  status === 429 && code === "credit_limit_exceeded";

const isRateLimit = (status: number, code: string): boolean =>
  status === 429 && code !== "credit_limit_exceeded";

export const createApiError = (init: PkmnPricesErrorInit): PkmnPricesError => {
  const { status, code } = init;

  if (status === 400) return new BadRequestError(init);
  if (status === 401) return new UnauthorizedError(init);
  if (status === 403) return new ForbiddenError(init);
  if (status === 404) return new NotFoundError(init);
  if (status === 409) return new ConflictError(init);
  if (isCreditLimit(status, code)) return new CreditLimitError(init);
  if (isRateLimit(status, code)) return new RateLimitError(init);
  if (status >= 500) return new InternalServerError(init);

  return new PkmnPricesError(init);
};
