import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { finalize, Observable, of, shareReplay, tap } from 'rxjs';

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

/** GETs still on the wire, so concurrent identical reads share one request. */
const pending = new Map<string, Observable<HttpEvent<unknown>>>();

/** Bumped on every clear, so a GET that started before a clear never stores its answer after it. */
let generation = 0;

export function clearHttpCache(): void {
  cache.clear();
  pending.clear();
  generation += 1;
}

function store(key: string, body: unknown): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { storedAt: Date.now(), body });
}

export const cacheWireResponseInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  if (req.method !== 'GET') {
    clearHttpCache();
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

  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const startedIn = generation;
  // refCount: false keeps the request alive when its first caller unsubscribes, so later joiners
  // still get the answer. An error resets the share and reaches every subscriber.
  const shared: Observable<HttpEvent<unknown>> = next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && startedIn === generation) store(key, event.body);
    }),
    finalize(() => {
      if (pending.get(key) === shared) pending.delete(key);
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );
  pending.set(key, shared);
  return shared;
};
