/**
 * Backend response envelope. Every successful domain response is wrapped as
 * `{ statusCode, message: 'Success', data }` — the envelope interceptor
 * unwraps `data` before responses reach services, so service code types the
 * inner payload directly. Better Auth routes (`/auth/*`) are NOT enveloped.
 */
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

/** Paginated list payload (already unwrapped from the envelope). */
export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Error body produced by the backend's global exception filter. */
export interface ApiErrorBody {
  statusCode: number;
  /** class-validator failures arrive as a string array. */
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/** First human-readable message out of an HTTP error body, with a fallback. */
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
