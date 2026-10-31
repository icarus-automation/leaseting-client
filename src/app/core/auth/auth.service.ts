import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { API_BASE_URL, AUTH_ENDPOINTS, ME_ENDPOINT } from '../config/api';
import { clearHttpCache } from '../http/cache.interceptor';
import type {
  FeatureFlags,
  GoogleSignInOptions,
  Organization,
  SessionResponse,
  SessionUser,
  SignInCredentials,
  SignInResponse,
  SocialSignInResponse,
} from './auth.types';
import { EVERY_PROPERTY, type PropertyAccess } from '../models/property-access.types';
import { WrongAppError, dedicatedAppRejection } from './audience.util';
import { holdsAll, type Permission } from './permissions';

interface ActivatedOrganization {
  organization: Organization;
  /** The session moved to another organization, so `/users/me` answers differently now. */
  changed: boolean;
}

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
  private readonly permissions = computed<ReadonlySet<string>>(
    () => new Set(this.user()?.permissions ?? []),
  );
  /** The properties the session works with. The API already filters every list to them. */
  readonly propertyAccess = computed<PropertyAccess>(() => this.user()?.propertyAccess ?? EVERY_PROPERTY);
  /**
   * False for someone limited to specific properties. Changes that reach every
   * property (adding one, an organization-wide payment destination) need it.
   */
  readonly hasEveryProperty = computed(() => !this.propertyAccess().isLimited);

  /**
   * True when `/users/me` lists `code` for the active organization. Hiding a
   * control with it is a convenience: the API still checks every call.
   */
  can(code: Permission): boolean {
    return this.permissions().has(code);
  }

  canAll(codes: readonly Permission[]): boolean {
    return holdsAll(this.permissions(), codes);
  }

  updateActiveOrganization(id: string, patch: Pick<Organization, 'name'>): void {
    this.organization.update((org) => (org && org.id === id ? { ...org, ...patch } : org));
  }

  /** `organizationId` opens that organization, e.g. one whose invitation was just accepted. */
  signIn(credentials: SignInCredentials, organizationId?: string): Observable<SessionUser> {
    return this.http
      .post<SignInResponse>(`${API_BASE_URL}${AUTH_ENDPOINTS.signInEmail}`, credentials)
      .pipe(switchMap(() => this.openSession(organizationId)));
  }

  /**
   * Starts Google sign-in and resolves to the Google page to send the browser
   * to. With an invitation token the API accepts the invitation as part of it.
   */
  startGoogleSignIn(options: GoogleSignInOptions): Observable<string> {
    const { invitationToken, ...redirects } = options;
    return this.http
      .post<SocialSignInResponse>(`${API_BASE_URL}${AUTH_ENDPOINTS.signInSocial}`, {
        provider: 'google',
        ...redirects,
        ...(invitationToken ? { additionalData: { invitationToken } } : {}),
      })
      .pipe(
        switchMap((response) =>
          response?.url ? of(response.url) : throwError(() => new Error('GOOGLE_UNAVAILABLE')),
        ),
      );
  }

  ensureSession(): Observable<boolean> {
    if (this.user() !== null) return of(true);
    this.restore$ ??= this.openSession().pipe(
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

  /** Re-reads the role and permissions, e.g. after a change to the caller's own role. */
  refreshMe(): Observable<SessionUser> {
    return this.loadMe();
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

  private openSession(organizationId?: string): Observable<SessionUser> {
    return this.loadMe().pipe(
      switchMap((me) =>
        this.activateOrganization(organizationId).pipe(
          // `/users/me` answers for the session's active organization.
          switchMap(({ changed }) => (changed ? this.loadMe() : of(me))),
        ),
      ),
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

  /**
   * One organization is simply set active. With several, the one asked for
   * wins, then the one the session already has open: the API opens the
   * invited organization when Google sign-in accepts an invitation.
   */
  private activateOrganization(preferredId?: string): Observable<ActivatedOrganization> {
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
          if (organizations.length === 1) return this.setActive(first, false);

          return this.http.get<SessionResponse | null>(`${API_BASE_URL}${AUTH_ENDPOINTS.getSession}`).pipe(
            catchError(() => of(null)),
            switchMap((response) => {
              const activeId = response?.session?.activeOrganizationId ?? null;
              const target =
                organizations.find((org) => org.id === preferredId) ??
                organizations.find((org) => org.id === activeId) ??
                first;
              if (target.id !== activeId) return this.setActive(target, true);
              this.organization.set(target);
              return of({ organization: target, changed: false });
            }),
          );
        }),
      );
  }

  private setActive(organization: Organization, changed: boolean): Observable<ActivatedOrganization> {
    return this.http
      .post(`${API_BASE_URL}${AUTH_ENDPOINTS.setActiveOrganization}`, {
        organizationId: organization.id,
      })
      .pipe(
        tap(() => this.organization.set(organization)),
        map(() => ({ organization, changed })),
      );
  }

  private clearSession(): void {
    this.user.set(null);
    this.organization.set(null);
    this.restore$ = null;
  }
}
