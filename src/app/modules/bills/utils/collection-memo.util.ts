export function collectionMemoError(notes: string | null | undefined): string | null {
  return notes?.trim() ? null : 'Collection memo is required.';
}

export function voidReasonError(reason: string | null | undefined): string | null {
  return reason?.trim() ? null : 'A void reason is required.';
}

export function canReviewSubmissions(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
}
