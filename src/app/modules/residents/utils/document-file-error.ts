import { apiErrorMessage } from '../../../core/models/api.types';

export const DOCUMENT_FILE_NOT_FOUND = 'File not found.';

/**
 * The message for a failed view or download. A 404 means the document or its
 * stored file is gone. The body of a blob request is a Blob, so the API's own
 * message cannot be read from it; other errors use `fallback`.
 */
export function documentFileError(error: unknown, fallback: string): string {
  if ((error as { status?: number } | null)?.status === 404) return DOCUMENT_FILE_NOT_FOUND;
  return apiErrorMessage(error, fallback);
}
