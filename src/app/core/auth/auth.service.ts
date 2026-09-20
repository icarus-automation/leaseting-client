import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { API_BASE_URL, AUTH_ENDPOINTS, ME_ENDPOINT } from '../config/api';
import { clearHttpCache } from '../http/cache.interceptor';
import type { FeatureFlags, Organization, SessionUser, SignInCredentials, SignInResponse } from './auth.types';
import { WrongAppError, dedicatedAppRejection } from './audience.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly user = signal<SessionUser | null>(null);
  private readonly organization = signal<Organization | null>(null);
  private restore$: Observable<boolean> | null = null;

  readonly currentUser = this.user.asReadonly();
  readonly activeOrganization = this.organization.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly features = computed<FeatureFlags>(
    () => this.user()?.features ?? { sms: false },
  );
  readonly isFinancialAdmin = computed(() => {
    const role = this.user()?.organizationRole;
    return role === 'owner' || role === 'admin';
  });

  updateActiveOrganization(id: string, patch: Pick<Organization, 'name'>): void {
    this.organization.update((org) => (org && org.id === id ? { ...org, ...patch } : org));
  }

  signIn(credentials: SignInCredentials): Observable<SessionUser> {
    return this.http
      .post<SignInResponse>(`${API_BASE_URL}${AUTH_ENDPOINTS.signInEmail}`, credentials)
      .pipe(
        switchMap(() => this.loadMe()),
        switchMap((me) => this.activateOrganization().pipe(map(() => me))),
      );
  }

  ensureSession(): Observable<boolean> {
    if (this.user() !== null) return of(true);
    this.restore$ ??= this.loadMe().pipe(
      switchMap(() => this.activateOrganization()),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
      tap(() => (this.restore$ = null)),
      shareReplay(1),
    );
    return this.restore$;
  }

  signOut(): Observable<void> {
    return this.http.post(`${API_BASE_URL}${AUTH_ENDPOINTS.signOut}`, {}).pipe(
      catchError(() => of(null)),
      map(() => {
        clearHttpCache();
        this.clearSession();
      }),
    );
  }

  private loadMe(): Observable<SessionUser> {
    return this.http.get<SessionUser>(`${API_BASE_URL}${ME_ENDPOINT}`).pipe(
      switchMap((me) => {
        const rejection = dedicatedAppRejection(me);
        if (rejection) {
          return this.http.post(`${API_BASE_URL}${AUTH_ENDPOINTS.signOut}`, {}).pipe(
            catchError(() => of(null)),
            tap(() => {
              clearHttpCache();
              this.clearSession();
            }),
            switchMap(() => throwError(() => new WrongAppError(rejection))),
          );
        }
        this.user.set(me);
        return of(me);
      }),
    );
  }

  private activateOrganization(): Observable<Organization> {
    return this.http
      .get<Organization[] | { data?: Organization[] }>(
        `${API_BASE_URL}${AUTH_ENDPOINTS.organizationList}`,
      )
      .pipe(
        map((response) => (Array.isArray(response) ? response : (response?.data ?? []))),
        switchMap((organizations) => {
          const first = organizations[0];
          if (!first) {
            return throwError(() => new Error('NO_ORGANIZATION'));
          }
          return this.http
            .post(`${API_BASE_URL}${AUTH_ENDPOINTS.setActiveOrganization}`, {
              organizationId: first.id,
            })
            .pipe(
              tap(() => this.organization.set(first)),
              map(() => first),
            );
        }),
      );
  }

  private clearSession(): void {
    this.user.set(null);
    this.organization.set(null);
    this.restore$ = null;
  }
}
