import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, tap } from 'rxjs';

import { API_BASE_URL, AUTH_ENDPOINTS, ME_ENDPOINT } from '../config/api';

/**
 * Auth is a server-side session cookie (Better Auth) — every API request must
 * carry credentials or the backend sees an anonymous caller.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);
  return next(req.clone({ withCredentials: true }));
};

/**
 * Unwraps the backend envelope `{ statusCode, message, data }` so services can
 * type the inner payload directly. Better Auth routes (`/auth/*`) return raw
 * bodies, so unwrapping is gated on the envelope shape, not just the URL.
 */
export const envelopeInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_BASE_URL)) return next(req);

  return next(req).pipe(
    map((event) => {
      if (event instanceof HttpResponse && isEnvelope(event.body)) {
        return event.clone({ body: event.body['data'] });
      }
      return event;
    }),
  );
};

/**
 * A 401 from an in-app API call means the session expired or was revoked —
 * reset to the login screen. Excluded: the sign-in call itself and the
 * `/users/me` session probe (the route guards own that redirect — navigating
 * from here while a guard is resolving cancels the guard's navigation and
 * re-triggers it, an infinite loop).
 */
export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isSignIn = req.url.endsWith(AUTH_ENDPOINTS.signInEmail);
  const isSessionProbe = req.url.endsWith(ME_ENDPOINT);

  return next(req).pipe(
    tap({
      error: (error: unknown) => {
        const navigatingToLogin = router
          .getCurrentNavigation()
          ?.finalUrl?.toString()
          .startsWith('/login');
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          req.url.startsWith(API_BASE_URL) &&
          !isSignIn &&
          !isSessionProbe &&
          !router.url.startsWith('/login') &&
          !navigatingToLogin
        ) {
          void router.navigateByUrl('/login');
        }
      },
    }),
  );
};

function isEnvelope(body: unknown): body is { statusCode: number; data: unknown } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'statusCode' in body &&
    'data' in body &&
    'message' in body
  );
}
