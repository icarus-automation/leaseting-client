import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Member } from '../../../core/models/member.types';
import { EVERY_PROPERTY } from '../../../core/models/property-access.types';
import type { PortalAccessResponse, PortalAccessStatus } from '../../../core/models/portal-access.types';
import type { ResidentListItem } from '../../../core/models/resident.types';
import { ResidentsService } from '../../residents/services/residents.service';
import { ResidentLoginLookupError } from '../utils/resident-login.util';
import { ResidentLoginsService } from './resident-logins.service';

function resident(id: string, email: string | null): ResidentListItem {
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

function page(data: ResidentListItem[], pageNumber = 1, lastPage = 1) {
  return { data, meta: { total: data.length, page: pageNumber, limit: 50, lastPage } };
}

const LOGIN: Member = {
  id: 'm-1',
  userId: 'u-1',
  name: 'Ana Cruz',
  email: 'ana@example.com',
  image: null,
  role: 'resident',
  roleName: 'Resident',
  audience: 'resident',
  status: 'ACTIVE',
  deactivatedAt: null,
  joinedAt: '2026-10-30T02:15:00.000Z',
  propertyAccess: EVERY_PROPERTY,
  lastActiveAt: null,
};

describe('ResidentLoginsService', () => {
  const residents = { list: vi.fn() };
  let service: ResidentLoginsService;
  let http: HttpTestingController;

  beforeEach(() => {
    residents.list.mockReset();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ResidentsService, useValue: residents }],
    });
    service = TestBed.inject(ResidentLoginsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function answerAccess(residentId: string, status: PortalAccessStatus): void {
    const body: PortalAccessResponse = { residentId, status, email: 'ana@example.com', mustChangePassword: false };
    http.expectOne(`${API_BASE_URL}/residents/${residentId}/portal-access`).flush(body);
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

      const req = http.expectOne(`${API_BASE_URL}/residents/t-1/${path}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ residentId: 't-1', status: 'ACTIVE', email: 'ana@example.com', mustChangePassword: false });
    });
  });

  describe('searchActive', () => {
    it('asks for active tenants by name', () => {
      residents.list.mockReturnValue(of(page([resident('t-1', null)])));
      let found: ResidentListItem[] = [];
      service.searchActive('  ana ').subscribe((rows) => (found = rows));

      expect(residents.list).toHaveBeenCalledWith({ q: 'ana', scope: 'active', limit: 50 });
      expect(found.map((row) => row.id)).toEqual(['t-1']);
    });

    it('sends no query for an empty search', () => {
      residents.list.mockReturnValue(of(page([])));
      service.searchActive('   ').subscribe();

      expect(residents.list).toHaveBeenCalledWith({ q: undefined, scope: 'active', limit: 50 });
    });
  });

  describe('findResidentId', () => {
    it('finds the one tenant with the login email that has a login', () => {
      residents.list.mockReturnValue(of(page([resident('t-1', 'Ana@Example.com'), resident('t-2', 'ben@example.com')])));
      let found: string | undefined;
      service.findResidentId(LOGIN).subscribe((id) => (found = id));

      answerAccess('t-1', 'ACTIVE');

      expect(found).toBe('t-1');
      expect(residents.list).toHaveBeenCalledWith({ scope: 'all', page: 1, limit: 50 });
    });

    it('remembers a login it already found', () => {
      residents.list.mockReturnValue(of(page([resident('t-1', 'ana@example.com')])));
      service.findResidentId(LOGIN).subscribe();
      answerAccess('t-1', 'MUST_CHANGE_PASSWORD');
      residents.list.mockClear();

      let found: string | undefined;
      service.findResidentId(LOGIN).subscribe((id) => (found = id));

      expect(found).toBe('t-1');
      expect(residents.list).not.toHaveBeenCalled();
    });

    it('reads every page of tenants', () => {
      residents.list.mockImplementation((query: { page: number }) =>
        of(
          query.page === 1
            ? page([resident('t-1', 'ben@example.com')], 1, 2)
            : page([resident('t-2', 'ana@example.com')], 2, 2),
        ),
      );
      let found: string | undefined;
      service.findResidentId(LOGIN).subscribe((id) => (found = id));

      answerAccess('t-2', 'ACTIVE');

      expect(found).toBe('t-2');
      expect(residents.list).toHaveBeenCalledTimes(2);
    });

    it('fails when no tenant carries the login email', () => {
      residents.list.mockReturnValue(of(page([resident('t-1', 'ben@example.com'), resident('t-2', null)])));
      let failure: unknown;
      service.findResidentId(LOGIN).subscribe({ error: (error: unknown) => (failure = error) });

      expect(failure).toBeInstanceOf(ResidentLoginLookupError);
    });

    it('fails when the tenant with that email has no login, rather than act on it', () => {
      residents.list.mockReturnValue(of(page([resident('t-1', 'ana@example.com')])));
      let failure: unknown;
      service.findResidentId(LOGIN).subscribe({ error: (error: unknown) => (failure = error) });

      answerAccess('t-1', 'INACTIVE');

      expect(failure).toBeInstanceOf(ResidentLoginLookupError);
    });

    it('picks the one that has a login when two tenants share the email', () => {
      residents.list.mockReturnValue(of(page([resident('t-1', 'ana@example.com'), resident('t-2', 'ana@example.com')])));
      let found: string | undefined;
      service.findResidentId(LOGIN).subscribe((id) => (found = id));

      answerAccess('t-1', 'INACTIVE');
      answerAccess('t-2', 'DISABLED');

      expect(found).toBe('t-2');
    });

    it('fails when two tenants sharing the email both have a login', () => {
      residents.list.mockReturnValue(of(page([resident('t-1', 'ana@example.com'), resident('t-2', 'ana@example.com')])));
      let failure: unknown;
      service.findResidentId(LOGIN).subscribe({ error: (error: unknown) => (failure = error) });

      answerAccess('t-1', 'ACTIVE');
      answerAccess('t-2', 'ACTIVE');

      expect(failure).toBeInstanceOf(ResidentLoginLookupError);
    });
  });
});
