import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL, AUTH_ENDPOINTS, ME_ENDPOINT } from '../config/api';
import { AuthService } from './auth.service';

describe('AuthService.updateActiveOrganization', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    auth.ensureSession().subscribe();
    http.expectOne(`${API_BASE_URL}${ME_ENDPOINT}`).flush({
      id: 'user-1',
      name: 'Ada',
      email: 'ada@leaseting.com',
      organizationRole: 'admin',
      audience: 'staff',
    });
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.organizationList}`).flush([
      { id: 'org-1', name: 'Old Name', slug: 'old', logo: 'https://cdn.example/old.png' },
    ]);
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.setActiveOrganization}`).flush({});
  });

  afterEach(() => http.verify());

  it('spreads a name patch onto the active organization and leaves slug and logo', () => {
    auth.updateActiveOrganization('org-1', { name: 'Acme Rentals' });

    expect(auth.activeOrganization()).toEqual({
      id: 'org-1',
      name: 'Acme Rentals',
      slug: 'old',
      logo: 'https://cdn.example/old.png',
    });
  });

  it('is a no-op when the id is not the active organization', () => {
    auth.updateActiveOrganization('org-other', { name: 'Acme Rentals' });

    expect(auth.activeOrganization()?.name).toBe('Old Name');
  });
});
