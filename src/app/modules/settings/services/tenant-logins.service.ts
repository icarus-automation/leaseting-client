import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Member } from '../../../core/models/member.types';
import type { PortalAccessResponse } from '../../../core/models/portal-access.types';
import type { TenantListItem } from '../../../core/models/tenant.types';
import { TenantsService } from '../../tenants/services/tenants.service';
import { TenantLoginLookupError, tenantIdsWithEmail } from '../utils/tenant-login.util';

/** The API's largest page for `GET /tenants`. */
const MAX_PAGE_SIZE = 50;

/**
 * Residence Care logins. The API keys them by tenant id, but `GET /members`
 * rows carry only the login's user id, so a login finds its tenant through the
 * email they share (see `findTenantId`).
 */
@Injectable({ providedIn: 'root' })
export class TenantLoginsService {
  private readonly http = inject(HttpClient);
  private readonly tenants = inject(TenantsService);
  private readonly base = `${API_BASE_URL}/tenants`;

  /** Login user id to tenant id. Once a login exists its tenant never changes. */
  private readonly linked = new Map<string, string>();

  access(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.get<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access`);
  }

  /** Sets up the login. The response carries the temporary password, once. */
  activate(tenantId: string, email: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/activate`, { email });
  }

  /** A new temporary password, shown once; sessions end. */
  reset(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/reset`, {});
  }

  disable(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/disable`, {});
  }

  enable(tenantId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${tenantId}/portal-access/reactivate`, {});
  }

  /** Active tenants by name, for choosing who to set a login up for. */
  searchActive(text: string): Observable<TenantListItem[]> {
    return this.tenants
      .list({ q: text.trim() || undefined, scope: 'active', limit: MAX_PAGE_SIZE })
      .pipe(map((page) => page.data));
  }

  /**
   * The tenant a login belongs to. The API gives a login no tenant id, so this
   * reads every tenant, keeps the ones with the login's email, and keeps the
   * one that has a login. Zero or several fail with `TenantLoginLookupError`:
   * acting on a guess could reset another tenant's password.
   */
  findTenantId(member: Member): Observable<string> {
    const known = this.linked.get(member.userId);
    if (known) return of(known);

    return this.everyTenant().pipe(
      map((tenants) => tenantIdsWithEmail(tenants, member.email)),
      switchMap((ids) =>
        ids.length === 0
          ? of([])
          : forkJoin(ids.map((id) => this.access(id).pipe(map((access) => ({ id, hasLogin: access.status !== 'INACTIVE' }))))),
      ),
      map((candidates) => candidates.filter((candidate) => candidate.hasLogin)),
      map((owners) => {
        if (owners.length !== 1) throw new TenantLoginLookupError();
        return owners[0].id;
      }),
      tap((tenantId) => this.linked.set(member.userId, tenantId)),
    );
  }

  /** Every tenant, archived included: page one, then the rest together. */
  private everyTenant(): Observable<TenantListItem[]> {
    const page = (number: number) => this.tenants.list({ scope: 'all', page: number, limit: MAX_PAGE_SIZE });
    return page(1).pipe(
      switchMap((first) => {
        const rest = Array.from({ length: Math.max(first.meta.lastPage - 1, 0) }, (_, index) => page(index + 2));
        return rest.length === 0
          ? of(first.data)
          : forkJoin(rest).pipe(map((pages) => [first, ...pages].flatMap((result) => result.data)));
      }),
    );
  }
}
