import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { API_BASE_URL, AUTH_ENDPOINTS, ME_ENDPOINT } from '../config/api';
import { clearHttpCache } from '../http/cache.interceptor';
import type { FeatureFlags, Organization, SessionUser, SignInCredentials, SignInResponse } from './auth.types';
import { TENANT_USE_MOBILE } from './auth.types';
import { isTenantAudience } from './tenant-audience.util';

/**
 * Cookie-session auth (Better Auth). The browser holds an HTTP-only session
 * cookie; nothing is persisted client-side. Every domain endpoint additionally
 * requires an active organization on the session, so sign-in and session
 * restore both finish by selecting one (first membership — single-org setup).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly user = signal<SessionUser | null>(null);
  private readonly organization = signal<Organization | null>(null);
  /** In-flight session restore, shared so parallel guard checks don't stack requests. */
  private restore$: Observable<boolean> | null = null;

  readonly currentUser = this.user.asReadonly();
  readonly activeOrganization = this.organization.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  /** Optional integrations (SMS) — off until /users/me says otherwise. */
  readonly features = computed<FeatureFlags>(
    () => this.user()?.features ?? { sms: false },
  );
  readonly isFinancialAdmin = computed(() => {
    const role = this.user()?.organizationRole;
    return role === 'owner' || role === 'admin';
  });

  /**
   * Sign-in chain: authenticate → pick the first organization → set it active
   * on the session → load the session user. Fails loudly at whichever step
   * breaks so the login screen can show a precise message.
   */
  signIn(credentials: SignInCredentials): Observable<SessionUser> {
    return this.http
      .post<SignInResponse>(`${API_BASE_URL}${AUTH_ENDPOINTS.signInEmail}`, credentials)
      .pipe(
        // Audience first: a tenant session must be cleared before any staff
        // organization call, so the login page can show the Residence Care message
        // instead of "no organization".
        switchMap(() => this.loadMe()),
        switchMap((me) => this.activateOrganization().pipe(map(() => me))),
      );
  }

  /**
   * Restores the session after a full page load (guard entry point). The
   * cookie survives reloads; re-activating the organization keeps domain
   * endpoints from 403ing even if the active org was never set.
   */
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
      catchError(() => of(null)), // clear local state even if the call fails
      // Cached reads are this user's data — never let them survive into the
      // next session on a shared machine.
      map(() => {
        clearHttpCache();
        this.clearSession();
      }),
    );
  }

  private loadMe(): Observable<SessionUser> {
    return this.http.get<SessionUser>(`${API_BASE_URL}${ME_ENDPOINT}`).pipe(
      switchMap((me) => {
        if (isTenantAudience(me)) {
          return this.http.post(`${API_BASE_URL}${AUTH_ENDPOINTS.signOut}`, {}).pipe(
            catchError(() => of(null)),
            tap(() => {
              clearHttpCache();
              this.clearSession();
            }),
            switchMap(() => throwError(() => new Error(TENANT_USE_MOBILE))),
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
