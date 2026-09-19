import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';

import { API_BASE_URL } from '../config/api';

const TTL_MS = 20_000;

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

export function clearHttpCache(): void {
  cache.clear();
}

export const cacheWireResponseInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
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
      if (cache.size >= MAX_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key, { storedAt: Date.now(), body: event.body });
    }),
  );
};
