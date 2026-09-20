import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../../core/config/api';
import { OrganizationSettings } from './organization-settings';

describe('OrganizationSettings', () => {
  const url = `${API_BASE_URL}/organization`;
  const profile = {
    id: 'org-1',
    name: 'Acme Rentals',
    addressLine: '12 Osmeña Blvd',
    city: 'Cebu City',
  };
  const canEdit = signal(true);
  let fixture: ComponentFixture<OrganizationSettings>;
  let component: OrganizationSettings;
  let http: HttpTestingController;

  beforeEach(async () => {
    canEdit.set(true);
    await TestBed.configureTestingModule({
      imports: [OrganizationSettings],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: AuthService, useValue: { isFinancialAdmin: canEdit } },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OrganizationSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    fixture.destroy();
  });

  function flushGet(body: typeof profile = profile): void {
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    req.flush(body);
    fixture.detectChanges();
  }

  it('does not PATCH when the form is invalid', () => {
    flushGet();
    component.form.controls.name.setValue('');

    component.submit();
    fixture.detectChanges();

    http.expectNone(url);
    expect(component.form.touched).toBe(true);
    expect(component.state()).toEqual({
      kind: 'ready',
      profile,
      save: { kind: 'failed', message: 'Enter a company name.' },
    });
  });

  it('does not PATCH when a viewer submits', () => {
    canEdit.set(false);
    flushGet();

    component.submit();

    http.expectNone(url);
  });

  it('does not PATCH a second submit while saving', () => {
    flushGet();
    component.form.setValue({
      name: 'Acme Rentals',
      addressLine: '12 Osmeña Blvd',
      city: 'Cebu City',
    });

    component.submit();
    const pending = http.match({ method: 'PATCH', url });
    expect(pending).toHaveLength(1);

    component.submit();
    expect(http.match({ method: 'PATCH', url })).toHaveLength(0);

    pending[0].flush(profile);
  });

  it('ignores a stale GET after Retry', () => {
    const first = http.expectOne(url);
    component.load();
    const second = http.expectOne(url);

    first.flush({ id: 'org-1', name: 'Stale Name', addressLine: null, city: null });
    expect(component.state().kind).toBe('loading');

    second.flush({ id: 'org-1', name: 'Fresh Name', addressLine: null, city: null });
    expect(component.state()).toMatchObject({
      kind: 'ready',
      profile: { name: 'Fresh Name' },
    });
  });
});
