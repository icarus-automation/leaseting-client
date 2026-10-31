import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type { Member, MemberListFilters, OwnershipTransfer } from '../../../core/models/member.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

/** The API's largest page for `GET /members`. */
const MAX_PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class MembersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/members`;

  list(filters: MemberListFilters = {}): Observable<Paginated<Member>> {
    const params = toHttpParams({ page: 1, limit: 10, ...filters });
    return this.http.get<Paginated<Member>>(this.base, { params });
  }

  /** Every staff member, deactivated included, sorted by name: page one, then the rest together. */
  listAllStaff(): Observable<Member[]> {
    const page = (page: number) => this.list({ audience: 'staff', page, limit: MAX_PAGE_SIZE });
    return page(1).pipe(
      switchMap((first) => {
        const rest = Array.from({ length: Math.max(first.meta.lastPage - 1, 0) }, (_, index) => page(index + 2));
        return rest.length === 0
          ? of(first.data)
          : forkJoin(rest).pipe(map((pages) => [first, ...pages].flatMap((result) => result.data)));
      }),
    );
  }

  changeRole(memberId: string, role: string): Observable<Member> {
    return this.http.patch<Member>(`${this.base}/${memberId}/role`, { role });
  }

  deactivate(memberId: string): Observable<Member> {
    return this.http.post<Member>(`${this.base}/${memberId}/deactivate`, {});
  }

  reactivate(memberId: string): Observable<Member> {
    return this.http.post<Member>(`${this.base}/${memberId}/reactivate`, {});
  }

  /** `memberId` becomes the owner; the caller becomes an admin. */
  transferOwnership(memberId: string): Observable<OwnershipTransfer> {
    return this.http.post<OwnershipTransfer>(`${this.base}/${memberId}/transfer-ownership`, {});
  }
}
