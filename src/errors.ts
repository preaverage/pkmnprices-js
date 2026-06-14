export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "credit_limit_exceeded"
  | "rate_limit_exceeded"
  | "internal_error";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

/** Credit / rate-limit metadata parsed from response headers. */
export interface RateLimitInfo {
  creditsCharged: number | null;
  creditsLimit: number | null;
  rateLimit: number | null;
  rateRemaining: number | null;
}

export interface PkmnPricesErrorInit {
  status: number;
  code: string;
  message: string;
  rateLimit: RateLimitInfo;
  retryAfterMs: number | null;
}

/** Base class for every error surfaced by the SDK. */
export class PkmnPricesError extends Error {
  readonly status: number;
  readonly code: string;
  readonly rateLimit: RateLimitInfo;
  readonly retryAfterMs: number | null;

  constructor(init: PkmnPricesErrorInit) {
    super(init.message);
    this.name = new.target.name;
    this.status = init.status;
    this.code = init.code;
    this.rateLimit = init.rateLimit;
    this.retryAfterMs = init.retryAfterMs;
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
      rateLimit: {
        creditsCharged: null,
        creditsLimit: null,
        rateLimit: null,
        rateRemaining: null,
      },
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
