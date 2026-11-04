export interface ApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  /** Set on a refusal the client can tell apart, such as BILL_PAID_REFUND_UNSUPPORTED. */
  code?: string;
  path: string;
  timestamp: string;
}

/** The refusal's `code`, or null when the API sent none. */
export function apiErrorCode(error: unknown): string | null {
  const body = (error as { error?: Partial<ApiErrorBody> | string | null } | null)?.error;
  if (!body || typeof body !== 'object') return null;
  return typeof body.code === 'string' ? body.code : null;
}

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const response = error as { status?: number; error?: Partial<ApiErrorBody> | string | null };
  if (response?.status === 0) {
    return "Can't reach the server. Check that the API is running.";
  }
  const body = response?.error;
  if (!body || typeof body !== 'object') return fallback;
  const message = body.message;
  if (Array.isArray(message) && message.length > 0) return message[0];
  if (typeof message === 'string' && message.length > 0) return message;
  return fallback;
}
