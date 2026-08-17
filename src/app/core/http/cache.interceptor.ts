import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api';

/**
 * How long a GET stays fresh. Short on purpose: this exists to collapse the
 * duplicate reads that happen when several components mount at once or the
 * user bounces between two screens, not to keep data around.
 */
const TTL_MS = 20_000;

/** Hard ceiling so a long session can't grow the map without bound. */
const MAX_ENTRIES = 60;

/**
 * Opt-out for reads whose whole purpose is to change: polling a job until it
 * finishes. Replaying a 20-second-old "still working" answer would stall the
 * poll for as long as the TTL. Stripped before the request leaves, so it stays
 * a client-side concern and never triggers a CORS preflight.
 */
export const SKIP_CACHE_HEADER = 'X-Skip-Cache';

interface CacheEntry {
  storedAt: number;
  body: unknown;
}

const cache = new Map<string, CacheEntry>();

/** Shared with AuthService — signing out must not leave one user's reads behind. */
export function clearHttpCache(): void {
  cache.clear();
}

/**
 * In-memory GET cache for API reads.
 *
 * Registered last so it sits innermost: it stores the raw enveloped body and
 * replays it through `envelopeInterceptor` exactly like a live response, which
 * keeps a hit and a miss indistinguishable to callers.
 *
 * Invalidation is deliberately blunt — any non-GET clears everything. Precise
 * per-resource invalidation would have to know that paying a bill changes
 * Kit's events, occupancy, and the dashboard totals; getting that mapping
 * wrong shows people stale money. Mutations are rare next to reads, so the
 * blunt version costs almost nothing and cannot be wrong.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  if (req.method !== 'GET') {
    cache.clear();
    return next(req);
  }

  if (req.headers.has(SKIP_CACHE_HEADER)) {
    return next(req.clone({ headers: req.headers.delete(SKIP_CACHE_HEADER) }));
  }

  const key = req.urlWithParams;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.storedAt < TTL_MS) {
    return of(new HttpResponse({ body: hit.body, status: 200, url: req.url }));
  }

  return next(req).pipe(
    tap((event) => {
      if (!(event instanceof HttpResponse)) return;
      // Map preserves insertion order, so the oldest key is always first.
      if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, { storedAt: Date.now(), body: event.body });
    }),
  );
};
