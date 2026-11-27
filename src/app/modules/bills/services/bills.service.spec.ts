import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import { SKIP_CACHE_HEADER } from '../../../core/http/cache.interceptor';
import { BillsService } from './bills.service';

describe('BillsService run previews', () => {
  let service: BillsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BillsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  for (const [name, path] of [
    ['rentRunPreview', 'rent-run/preview'],
    ['duesRunPreview', 'dues-run/preview'],
  ] as const) {
    it(`${name} reads the count fresh, past the 20-second cache`, async () => {
      const count = firstValueFrom(service[name]());
      const request = http.expectOne(`${API_BASE_URL}/bills/${path}`);

      expect(request.request.method).toBe('GET');
      expect(request.request.headers.has(SKIP_CACHE_HEADER)).toBe(true);
      request.flush({ count: 3 });
      expect(await count).toEqual({ count: 3 });
    });
  }
});
