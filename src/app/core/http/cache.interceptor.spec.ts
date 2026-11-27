import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../config/api';
import { cacheWireResponseInterceptor, clearHttpCache, SKIP_CACHE_HEADER } from './cache.interceptor';

describe('cacheWireResponseInterceptor', () => {
  const url = `${API_BASE_URL}/properties?page=1&limit=50`;
  let client: HttpClient;
  let http: HttpTestingController;

  beforeEach(() => {
    clearHttpCache();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheWireResponseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    clearHttpCache();
  });

  function read(target = url, headers?: Record<string, string>): { bodies: unknown[]; errors: unknown[] } {
    const result = { bodies: [] as unknown[], errors: [] as unknown[] };
    client.get(target, { headers }).subscribe({
      next: (body) => result.bodies.push(body),
      error: (error: unknown) => result.errors.push(error),
    });
    return result;
  }

  it('sends one request for concurrent identical GETs and gives both callers the body', () => {
    const first = read();
    const second = read();

    http.expectOne(url).flush({ items: ['a'] });

    expect(first.bodies).toEqual([{ items: ['a'] }]);
    expect(second.bodies).toEqual([{ items: ['a'] }]);
  });

  it('serves a completed GET from the cache', () => {
    read();
    http.expectOne(url).flush({ items: ['a'] });

    const later = read();

    http.expectNone(url);
    expect(later.bodies).toEqual([{ items: ['a'] }]);
  });

  it('delivers an error to every caller and lets the next GET reach the network', () => {
    const first = read();
    const second = read();

    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });

    expect(first.errors).toHaveLength(1);
    expect(second.errors).toHaveLength(1);
    expect((first.errors[0] as HttpErrorResponse).status).toBe(500);
    expect((second.errors[0] as HttpErrorResponse).status).toBe(500);

    const retry = read();
    http.expectOne(url).flush({ items: ['b'] });
    expect(retry.bodies).toEqual([{ items: ['b'] }]);
  });

  it('never lets a GET after a write join, or be answered by, a GET that started before it', () => {
    const before = read();
    client.post(`${API_BASE_URL}/properties`, { name: 'New' }).subscribe();
    const after = read();

    const [stale, fresh] = http.match(url);
    expect(fresh).toBeDefined();
    http.expectOne({ method: 'POST', url: `${API_BASE_URL}/properties` }).flush({});
    fresh.flush({ items: ['fresh'] });
    stale.flush({ items: ['stale'] });

    expect(before.bodies).toEqual([{ items: ['stale'] }]);
    expect(after.bodies).toEqual([{ items: ['fresh'] }]);

    const next = read();
    http.expectNone(url);
    expect(next.bodies).toEqual([{ items: ['fresh'] }]);
  });

  it('never shares a GET that skips the cache, and strips the opt-out header', () => {
    read(url, { [SKIP_CACHE_HEADER]: 'true' });
    read(url, { [SKIP_CACHE_HEADER]: 'true' });

    const requests = http.match(url);
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.request.headers.has(SKIP_CACHE_HEADER)).toBe(false);
      request.flush({ items: [] });
    }
  });
});
