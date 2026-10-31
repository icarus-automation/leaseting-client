import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { API_BASE_URL } from '../../../core/config/api';
import type { Role } from '../../../core/models/role.types';
import { RolesService } from './roles.service';

const ROLE: Role = {
  id: '6f1c2a9e-4b7d-4c1e-9a3f-2d8b5e7c1a40',
  name: 'Leasing agent',
  description: 'Front desk',
  kind: 'custom',
  isLocked: false,
  isActive: true,
  isAssignable: true,
  audience: 'staff',
  permissions: ['tenants:view', 'leases:view'],
  memberCount: 0,
  createdAt: '2026-10-30T02:15:00.000Z',
  updatedAt: '2026-10-30T02:15:00.000Z',
};

describe('RolesService', () => {
  const url = `${API_BASE_URL}/roles`;
  let service: RolesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RolesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GETs /roles with no query', () => {
    let rows: Role[] | undefined;
    service.list().subscribe((value) => {
      rows = value;
    });

    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([ROLE]);

    expect(rows).toEqual([ROLE]);
  });

  it('GETs /roles/:id', () => {
    let row: Role | undefined;
    service.get(ROLE.id).subscribe((value) => {
      row = value;
    });

    const req = http.expectOne(`${url}/${ROLE.id}`);
    expect(req.request.method).toBe('GET');
    req.flush(ROLE);

    expect(row).toEqual(ROLE);
  });

  it('POSTs /roles with the write body', () => {
    const payload = { name: 'Leasing agent', description: 'Front desk', permissions: ['tenants:view'] };
    let row: Role | undefined;
    service.create(payload).subscribe((value) => {
      row = value;
    });

    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(ROLE);

    expect(row).toEqual(ROLE);
  });

  it('PATCHes /roles/:id with the write body', () => {
    const payload = { name: 'Senior agent', description: null, permissions: [] };
    let row: Role | undefined;
    service.update(ROLE.id, payload).subscribe((value) => {
      row = value;
    });

    const req = http.expectOne(`${url}/${ROLE.id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(payload);
    req.flush({ ...ROLE, ...payload });

    expect(row?.name).toBe('Senior agent');
    expect(row?.description).toBeNull();
  });

  it('PATCHes /roles/:id/active with { isActive }', () => {
    let row: Role | undefined;
    service.setActive(ROLE.id, false).subscribe((value) => {
      row = value;
    });

    const req = http.expectOne(`${url}/${ROLE.id}/active`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ isActive: false });
    req.flush({ ...ROLE, isActive: false, isAssignable: false });

    expect(row?.isActive).toBe(false);
  });

  it('DELETEs /roles/:id', () => {
    let row: Role | undefined;
    service.remove(ROLE.id).subscribe((value) => {
      row = value;
    });

    const req = http.expectOne(`${url}/${ROLE.id}`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    req.flush(ROLE);

    expect(row).toEqual(ROLE);
  });
});
