import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../auth/auth.service';
import type { SessionUser } from '../auth/auth.types';
import { API_BASE_URL } from '../config/api';
import { PendingPaymentSubmissionsService } from './pending-payment-submissions.service';

const ADMIN: SessionUser = { id: 'user-1', name: 'Leaseting Admin', email: 'admin@leaseting.com' };

describe('PendingPaymentSubmissionsService', () => {
  const url = `${API_BASE_URL}/payment-submissions/pending-count`;
  const currentUser = signal<SessionUser | null>(ADMIN);
  let service: PendingPaymentSubmissionsService;
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
    service = TestBed.inject(PendingPaymentSubmissionsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the pending review total from the payment submission count endpoint', () => {
    expect(service.count()).toBeNull();
    service.refresh();

    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush({ pendingCount: 4 });

    expect(service.count()).toBe(4);
  });

  it('cancels an older read when refreshed again', () => {
    service.refresh();
    const first = http.expectOne(url);

    service.refresh();

    expect(first.cancelled).toBe(true);
    http.expectOne(url).flush({ pendingCount: 2 });
    expect(service.count()).toBe(2);
  });

  it('hides the count when a read fails', () => {
    service.refresh();
    http.expectOne(url).flush(null, { status: 500, statusText: 'Server Error' });

    expect(service.count()).toBeNull();
  });

  it("never shows one user's count to the next", () => {
    service.refresh();
    http.expectOne(url).flush({ pendingCount: 5 });

    currentUser.set({ id: 'user-2', name: 'Another manager', email: 'manager@example.com' });

    expect(service.count()).toBeNull();
  });

  it('does not read without a signed-in user', () => {
    currentUser.set(null);

    service.refresh();

    http.expectNone(url);
    expect(service.count()).toBeNull();
  });
});
