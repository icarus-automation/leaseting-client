import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../../core/auth/auth.service';
import type { Organization } from '../../../core/auth/auth.types';
import { API_BASE_URL } from '../../../core/config/api';
import { OrganizationProfileService } from './organization-profile.service';

describe('OrganizationProfileService', () => {
  const url = `${API_BASE_URL}/organization`;
  const activeOrganization = signal<Organization | null>(null);
  let service: OrganizationProfileService;
  let http: HttpTestingController;
  let auth: {
    activeOrganization: typeof activeOrganization;
    updateActiveOrganization: (id: string, patch: Pick<Organization, 'name'>) => void;
  };

  beforeEach(() => {
    activeOrganization.set({
      id: 'org-1',
      name: 'Old Name',
      slug: 'old',
      logo: 'https://cdn.example/old.png',
    });

    auth = {
      activeOrganization,
      updateActiveOrganization(id: string, patch: Pick<Organization, 'name'>): void {
        activeOrganization.update((org) => (org && org.id === id ? { ...org, ...patch } : org));
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    service = TestBed.inject(OrganizationProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs /organization and yields empty address fields', () => {
    let profile: unknown;
    service.get().subscribe((value) => {
      profile = value;
    });

    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 'org-1',
      name: 'Acme Rentals',
      addressLine: null,
      city: null,
      slug: 'acme',
    });

    expect(profile).toEqual({
      id: 'org-1',
      name: 'Acme Rentals',
      addressLine: '',
      city: '',
    });
  });

  it('PATCHes a trimmed body with null blanks and renames the header', () => {
    let profile: unknown;
    service
      .save({ name: '  Acme Rentals  ', addressLine: '', city: 'Cebu City' })
      .subscribe((value) => {
        profile = value;
      });

    const req = http.expectOne(url);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      name: 'Acme Rentals',
      addressLine: null,
      city: 'Cebu City',
    });
    req.flush({
      id: 'org-1',
      name: 'Acme Rentals',
      addressLine: null,
      city: 'Cebu City',
    });

    expect(profile).toEqual({
      id: 'org-1',
      name: 'Acme Rentals',
      addressLine: '',
      city: 'Cebu City',
    });
    expect(auth.activeOrganization()?.name).toBe('Acme Rentals');
    expect(auth.activeOrganization()?.slug).toBe('old');
    expect(auth.activeOrganization()?.logo).toBe('https://cdn.example/old.png');
    expect(auth.activeOrganization()?.id).toBe('org-1');
  });

  it('leaves the header alone when the saved profile is not the active organization', () => {
    service.save({ name: 'Acme', addressLine: '', city: '' }).subscribe();

    http.expectOne(url).flush({
      id: 'org-other',
      name: 'Acme',
      addressLine: null,
      city: null,
    });

    expect(auth.activeOrganization()?.name).toBe('Old Name');
    expect(auth.activeOrganization()?.slug).toBe('old');
    expect(auth.activeOrganization()?.logo).toBe('https://cdn.example/old.png');
  });

  it('leaves the header alone when the PATCH fails', () => {
    service.save({ name: 'Acme', addressLine: '', city: '' }).subscribe({
      error: () => undefined,
    });

    http.expectOne(url).flush('nope', { status: 500, statusText: 'Server Error' });

    expect(auth.activeOrganization()?.name).toBe('Old Name');
    expect(auth.activeOrganization()?.slug).toBe('old');
    expect(auth.activeOrganization()?.logo).toBe('https://cdn.example/old.png');
  });
});
