import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Member } from '../../../core/models/member.types';
import type { PortalAccessResponse, PortalAccessStatus } from '../../../core/models/portal-access.types';
import type { TenantListItem } from '../../../core/models/tenant.types';
import { TenantsService } from '../../tenants/services/tenants.service';
import { TenantLoginLookupError } from '../utils/tenant-login.util';
import { TenantLoginsService } from './tenant-logins.service';

function tenant(id: string, email: string | null): TenantListItem {
  return {
    id,
    firstName: 'Ana',
    lastName: 'Cruz',
    email,
    contactNo: '09171234567',
    photoUrl: null,
    notes: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    outstandingBalance: '0.00',
    unpaidBillCount: 0,
    maxDaysOverdue: 0,
  };
}

function page(data: TenantListItem[], pageNumber = 1, lastPage = 1) {
  return { data, meta: { total: data.length, page: pageNumber, limit: 50, lastPage } };
}

const LOGIN: Member = {
  id: 'm-1',
  userId: 'u-1',
  name: 'Ana Cruz',
  email: 'ana@example.com',
  image: null,
  role: 'tenant',
  roleName: 'Tenant',
  audience: 'tenant',
  status: 'ACTIVE',
  deactivatedAt: null,
  joinedAt: '2026-10-30T02:15:00.000Z',
};

describe('TenantLoginsService', () => {
  const tenants = { list: vi.fn() };
  let service: TenantLoginsService;
  let http: HttpTestingController;

  beforeEach(() => {
    tenants.list.mockReset();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: TenantsService, useValue: tenants }],
    });
    service = TestBed.inject(TenantLoginsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function answerAccess(tenantId: string, status: PortalAccessStatus): void {
    const body: PortalAccessResponse = { tenantId, status, email: 'ana@example.com', mustChangePassword: false };
    http.expectOne(`${API_BASE_URL}/tenants/${tenantId}/portal-access`).flush(body);
  }

  describe('login calls', () => {
    it.each([
      ['activate', 'portal-access/activate', { email: 'ana@example.com' }],
      ['reset', 'portal-access/reset', {}],
      ['disable', 'portal-access/disable', {}],
      ['enable', 'portal-access/reactivate', {}],
    ] as const)('%s POSTs to the tenant login route', (method, path, body) => {
      const call = method === 'activate' ? service.activate('t-1', 'ana@example.com') : service[method]('t-1');
      call.subscribe();

      const req = http.expectOne(`${API_BASE_URL}/tenants/t-1/${path}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ tenantId: 't-1', status: 'ACTIVE', email: 'ana@example.com', mustChangePassword: false });
    });
  });

  describe('searchActive', () => {
    it('asks for active tenants by name', () => {
      tenants.list.mockReturnValue(of(page([tenant('t-1', null)])));
      let found: TenantListItem[] = [];
      service.searchActive('  ana ').subscribe((rows) => (found = rows));

      expect(tenants.list).toHaveBeenCalledWith({ q: 'ana', scope: 'active', limit: 50 });
      expect(found.map((row) => row.id)).toEqual(['t-1']);
    });

    it('sends no query for an empty search', () => {
      tenants.list.mockReturnValue(of(page([])));
      service.searchActive('   ').subscribe();

      expect(tenants.list).toHaveBeenCalledWith({ q: undefined, scope: 'active', limit: 50 });
    });
  });

  describe('findTenantId', () => {
    it('finds the one tenant with the login email that has a login', () => {
      tenants.list.mockReturnValue(of(page([tenant('t-1', 'Ana@Example.com'), tenant('t-2', 'ben@example.com')])));
      let found: string | undefined;
      service.findTenantId(LOGIN).subscribe((id) => (found = id));

      answerAccess('t-1', 'ACTIVE');

      expect(found).toBe('t-1');
      expect(tenants.list).toHaveBeenCalledWith({ scope: 'all', page: 1, limit: 50 });
    });

    it('remembers a login it already found', () => {
      tenants.list.mockReturnValue(of(page([tenant('t-1', 'ana@example.com')])));
      service.findTenantId(LOGIN).subscribe();
      answerAccess('t-1', 'MUST_CHANGE_PASSWORD');
      tenants.list.mockClear();

      let found: string | undefined;
      service.findTenantId(LOGIN).subscribe((id) => (found = id));

      expect(found).toBe('t-1');
      expect(tenants.list).not.toHaveBeenCalled();
    });

    it('reads every page of tenants', () => {
      tenants.list.mockImplementation((query: { page: number }) =>
        of(
          query.page === 1
            ? page([tenant('t-1', 'ben@example.com')], 1, 2)
            : page([tenant('t-2', 'ana@example.com')], 2, 2),
        ),
      );
      let found: string | undefined;
      service.findTenantId(LOGIN).subscribe((id) => (found = id));

      answerAccess('t-2', 'ACTIVE');

      expect(found).toBe('t-2');
      expect(tenants.list).toHaveBeenCalledTimes(2);
    });

    it('fails when no tenant carries the login email', () => {
      tenants.list.mockReturnValue(of(page([tenant('t-1', 'ben@example.com'), tenant('t-2', null)])));
      let failure: unknown;
      service.findTenantId(LOGIN).subscribe({ error: (error: unknown) => (failure = error) });

      expect(failure).toBeInstanceOf(TenantLoginLookupError);
    });

    it('fails when the tenant with that email has no login, rather than act on it', () => {
      tenants.list.mockReturnValue(of(page([tenant('t-1', 'ana@example.com')])));
      let failure: unknown;
      service.findTenantId(LOGIN).subscribe({ error: (error: unknown) => (failure = error) });

      answerAccess('t-1', 'INACTIVE');

      expect(failure).toBeInstanceOf(TenantLoginLookupError);
    });

    it('picks the one that has a login when two tenants share the email', () => {
      tenants.list.mockReturnValue(of(page([tenant('t-1', 'ana@example.com'), tenant('t-2', 'ana@example.com')])));
      let found: string | undefined;
      service.findTenantId(LOGIN).subscribe((id) => (found = id));

      answerAccess('t-1', 'INACTIVE');
      answerAccess('t-2', 'DISABLED');

      expect(found).toBe('t-2');
    });

    it('fails when two tenants sharing the email both have a login', () => {
      tenants.list.mockReturnValue(of(page([tenant('t-1', 'ana@example.com'), tenant('t-2', 'ana@example.com')])));
      let failure: unknown;
      service.findTenantId(LOGIN).subscribe({ error: (error: unknown) => (failure = error) });

      answerAccess('t-1', 'ACTIVE');
      answerAccess('t-2', 'ACTIVE');

      expect(failure).toBeInstanceOf(TenantLoginLookupError);
    });
  });
});
