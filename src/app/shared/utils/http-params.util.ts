import { HttpParams } from '@angular/common/http';

/**
 * A filter object as query params, skipping everything unset.
 *
 * Written once because every grid now has a dozen optional filters, and the
 * hand-rolled `if (x) params = params.set(...)` chain each list service used to
 * carry is where a filter goes missing — the line simply never gets added when
 * a new one is introduced.
 *
 * `false` and `0` are sent, `''`/null/undefined are not. That distinction is
 * the whole point: `overdueOnly=false` is a real instruction, while a cleared
 * input is the absence of one, and a truthiness check reads both as absence.
 */
export function toHttpParams(source: Record<string, unknown>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}
