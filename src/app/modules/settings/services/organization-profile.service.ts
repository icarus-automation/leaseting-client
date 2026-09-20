import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { API_BASE_URL } from '../../../core/config/api';
import type { OrganizationProfile, OrganizationProfileDraft } from '../../../core/models/organization.types';
import {
  type OrganizationProfileDto,
  parseOrganizationProfile,
  toOrganizationProfilePatchBody,
} from '../utils/organization-profile.util';

@Injectable({ providedIn: 'root' })
export class OrganizationProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${API_BASE_URL}/organization`;

  get(): Observable<OrganizationProfile> {
    return this.http.get<OrganizationProfileDto>(this.base).pipe(map(parseOrganizationProfile));
  }

  save(draft: OrganizationProfileDraft): Observable<OrganizationProfile> {
    return this.http.patch<OrganizationProfileDto>(this.base, toOrganizationProfilePatchBody(draft)).pipe(
      map(parseOrganizationProfile),
      tap((profile) => this.auth.updateActiveOrganization(profile.id, { name: profile.name })),
    );
  }
}
