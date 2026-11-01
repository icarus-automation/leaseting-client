import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Member } from '../../../core/models/member.types';
import type { PortalAccessResponse } from '../../../core/models/portal-access.types';
import type { ResidentListItem } from '../../../core/models/resident.types';
import { ResidentsService } from '../../residents/services/residents.service';
import { ResidentLoginLookupError, residentIdsWithEmail } from '../utils/resident-login.util';

/** The API's largest page for `GET /residents`. */
const MAX_PAGE_SIZE = 50;

/**
 * Residence Care logins. The API keys them by resident id, but `GET /members`
 * rows carry only the login's user id, so a login finds its resident through the
 * email they share (see `findResidentId`).
 */
@Injectable({ providedIn: 'root' })
export class ResidentLoginsService {
  private readonly http = inject(HttpClient);
  private readonly residents = inject(ResidentsService);
  private readonly base = `${API_BASE_URL}/residents`;

  /** Login user id to resident id. Once a login exists its resident never changes. */
  private readonly linked = new Map<string, string>();

  access(residentId: string): Observable<PortalAccessResponse> {
    return this.http.get<PortalAccessResponse>(`${this.base}/${residentId}/portal-access`);
  }

  /** Sets up the login. The response carries the temporary password, once. */
  activate(residentId: string, email: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${residentId}/portal-access/activate`, { email });
  }

  /** A new temporary password, shown once; sessions end. */
  reset(residentId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${residentId}/portal-access/reset`, {});
  }

  disable(residentId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${residentId}/portal-access/disable`, {});
  }

  enable(residentId: string): Observable<PortalAccessResponse> {
    return this.http.post<PortalAccessResponse>(`${this.base}/${residentId}/portal-access/reactivate`, {});
  }

  /** Active residents by name, for choosing who to set a login up for. */
  searchActive(text: string): Observable<ResidentListItem[]> {
    return this.residents
      .list({ q: text.trim() || undefined, scope: 'active', limit: MAX_PAGE_SIZE })
      .pipe(map((page) => page.data));
  }

  /**
   * The resident a login belongs to. The API gives a login no resident id, so this
   * reads every resident, keeps the ones with the login's email, and keeps the
   * one that has a login. Zero or several fail with `ResidentLoginLookupError`:
   * acting on a guess could reset another resident's password.
   */
  findResidentId(member: Member): Observable<string> {
    const known = this.linked.get(member.userId);
    if (known) return of(known);

    return this.everyResident().pipe(
      map((residents) => residentIdsWithEmail(residents, member.email)),
      switchMap((ids) =>
        ids.length === 0
          ? of([])
          : forkJoin(ids.map((id) => this.access(id).pipe(map((access) => ({ id, hasLogin: access.status !== 'INACTIVE' }))))),
      ),
      map((candidates) => candidates.filter((candidate) => candidate.hasLogin)),
      map((owners) => {
        if (owners.length !== 1) throw new ResidentLoginLookupError();
        return owners[0].id;
      }),
      tap((residentId) => this.linked.set(member.userId, residentId)),
    );
  }

  /** Every resident, archived included: page one, then the rest together. */
  private everyResident(): Observable<ResidentListItem[]> {
    const page = (number: number) => this.residents.list({ scope: 'all', page: number, limit: MAX_PAGE_SIZE });
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
