import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '../auth/auth.service';
import type { SessionUser } from '../auth/auth.types';
import { API_BASE_URL } from '../config/api';
import { OpenRequestsService } from './open-requests.service';

const ADMIN: SessionUser = { id: 'user-1', name: 'Leaseting Admin', email: 'admin@leaseting.com' };

describe('OpenRequestsService', () => {
  const url = `${API_BASE_URL}/maintenance-requests`;
  const currentUser = signal<SessionUser | null>(ADMIN);
  let service: OpenRequestsService;
  let http: HttpTestingController;

  beforeEach(() => {
    currentUser.set(ADMIN);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    service = TestBed.inject(OpenRequestsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the Open total from a one-row page, as the contract describes', () => {
    expect(service.count()).toBeNull();
    service.refresh();

    const req = http.expectOne((request) => request.url === url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.toString()).toBe('page=1&limit=1&status=OPEN');
    req.flush({ data: [], meta: { total: 4, page: 1, limit: 1, lastPage: 4 } });

    expect(service.count()).toBe(4);
  });

  it('hides the count when a read fails', () => {
    service.refresh();

    http
      .expectOne((request) => request.url === url)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(service.count()).toBeNull();
  });

  it("never shows one user's count to the next", () => {
    service.refresh();
    http
      .expectOne((request) => request.url === url)
      .flush({ data: [], meta: { total: 5, page: 1, limit: 1, lastPage: 5 } });
    currentUser.set({ id: 'user-2', name: 'Another manager', email: 'manager@example.com' });

    expect(service.count()).toBeNull();
  });

  it('does not read without a signed-in user', () => {
    currentUser.set(null);

    service.refresh();

    http.expectNone((request) => request.url === url);
    expect(service.count()).toBeNull();
  });
});
