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

describe('AuthService permissions and organizations', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  const me = (overrides: Record<string, unknown> = {}) => ({
    id: 'user-1',
    name: 'Ana',
    email: 'ana@leaseting.com',
    organizationRole: 'member',
    audience: 'staff',
    permissions: [],
    ...overrides,
  });
  const twoOrganizations = [
    { id: 'org-1', name: 'First', slug: 'first' },
    { id: 'org-2', name: 'Second', slug: 'second' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function restoreWithOneOrganization(body: Record<string, unknown>): void {
    auth.ensureSession().subscribe();
    http.expectOne(`${API_BASE_URL}${ME_ENDPOINT}`).flush(body);
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.organizationList}`).flush([twoOrganizations[0]]);
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.setActiveOrganization}`).flush({});
  }

  it('answers can() from the codes /users/me lists, ignoring codes it does not know', () => {
    restoreWithOneOrganization(me({ permissions: ['members:view', 'bills:view', 'reports:export'] }));

    expect(auth.can('members:view')).toBe(true);
    expect(auth.can('members:invite')).toBe(false);
    expect(auth.canAll(['members:view', 'bills:view'])).toBe(true);
    expect(auth.canAll(['members:view', 'roles:manage'])).toBe(false);
  });

  it('holds nothing before a session, or when the API lists no permissions', () => {
    expect(auth.can('bills:view')).toBe(false);

    restoreWithOneOrganization(me({ organizationRole: 'admin', permissions: undefined }));

    expect(auth.can('bills:view')).toBe(false);
  });

  it('re-reads /users/me after opening an organization for someone in several', () => {
    auth.ensureSession().subscribe();
    http.expectOne(`${API_BASE_URL}${ME_ENDPOINT}`).flush(me({ organizationRole: null }));
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.organizationList}`).flush(twoOrganizations);
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.getSession}`).flush({ session: { activeOrganizationId: null } });
    const setActive = http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.setActiveOrganization}`);
    expect(setActive.request.body).toEqual({ organizationId: 'org-1' });
    setActive.flush({});
    http.expectOne(`${API_BASE_URL}${ME_ENDPOINT}`).flush(me({ organizationRole: 'admin', permissions: ['members:view'] }));

    expect(auth.activeOrganization()?.id).toBe('org-1');
    expect(auth.can('members:view')).toBe(true);
  });

  it('keeps the organization the session already has open, as after a Google invitation', () => {
    auth.ensureSession().subscribe();
    http.expectOne(`${API_BASE_URL}${ME_ENDPOINT}`).flush(me({ permissions: ['members:view'] }));
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.organizationList}`).flush(twoOrganizations);
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.getSession}`).flush({ session: { activeOrganizationId: 'org-2' } });
    http.expectNone(`${API_BASE_URL}${AUTH_ENDPOINTS.setActiveOrganization}`);

    expect(auth.activeOrganization()?.name).toBe('Second');
    expect(auth.can('members:view')).toBe(true);
  });

  it('opens the organization a sign-in asks for, such as one just joined', () => {
    auth.signIn({ email: 'ana@leaseting.com', password: 'a-long-password' }, 'org-2').subscribe();
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.signInEmail}`).flush({});
    http.expectOne(`${API_BASE_URL}${ME_ENDPOINT}`).flush(me({ organizationRole: null }));
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.organizationList}`).flush(twoOrganizations);
    http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.getSession}`).flush({ session: { activeOrganizationId: 'org-1' } });
    const setActive = http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.setActiveOrganization}`);
    expect(setActive.request.body).toEqual({ organizationId: 'org-2' });
    setActive.flush({});
    http.expectOne(`${API_BASE_URL}${ME_ENDPOINT}`).flush(me({ permissions: ['bills:view'] }));

    expect(auth.activeOrganization()?.id).toBe('org-2');
    expect(auth.can('bills:view')).toBe(true);
  });

  it('passes an invitation token to Google sign-in as additionalData', () => {
    let url: string | undefined;
    auth
      .startGoogleSignIn({
        callbackURL: 'http://localhost:4200/dashboard',
        errorCallbackURL: 'http://localhost:4200/accept-invite?token=abc.def',
        invitationToken: 'abc.def',
      })
      .subscribe((next) => (url = next));

    const start = http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.signInSocial}`);
    expect(start.request.body).toEqual({
      provider: 'google',
      callbackURL: 'http://localhost:4200/dashboard',
      errorCallbackURL: 'http://localhost:4200/accept-invite?token=abc.def',
      additionalData: { invitationToken: 'abc.def' },
    });
    start.flush({ url: 'https://accounts.google.com/o/oauth2/v2/auth?x=1', redirect: true });

    expect(url).toBe('https://accounts.google.com/o/oauth2/v2/auth?x=1');
  });

  it('sends no additionalData for a plain Google sign-in', () => {
    auth.startGoogleSignIn({ callbackURL: 'http://app/dashboard', errorCallbackURL: 'http://app/login' }).subscribe();

    const start = http.expectOne(`${API_BASE_URL}${AUTH_ENDPOINTS.signInSocial}`);
    expect(start.request.body).toEqual({
      provider: 'google',
      callbackURL: 'http://app/dashboard',
      errorCallbackURL: 'http://app/login',
    });
    start.flush({ url: 'https://accounts.google.com/' });
  });
});
