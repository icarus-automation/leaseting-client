import { environment } from '../../../environments/environment';

/**
 * API configuration.
 *
 * `API_BASE_URL` comes from src/environments/ — `environment.ts` for dev
 * (`ng serve`), `environment.prod.ts` for prod builds (swapped in via
 * angular.json fileReplacements). Change the host there, not here.
 */
export const API_BASE_URL = environment.apiBaseUrl;

/**
 * Better Auth routes. NOT wrapped in the `{ statusCode, message, data }`
 * envelope — the envelope interceptor skips them by shape.
 */
export const AUTH_ENDPOINTS = {
  /** POST { email, password } — email/password sign-in. Sets the session cookie. */
  signInEmail: '/auth/sign-in/email',
  /** POST — clears the session cookie. */
  signOut: '/auth/sign-out',
  /** GET — organizations the signed-in user belongs to. */
  organizationList: '/auth/organization/list',
  /**
   * POST { organizationId } — scopes the session to an organization.
   * Required after sign-in: domain endpoints 403 without an active org.
   */
  setActiveOrganization: '/auth/organization/set-active',
} as const;

/** Enveloped domain route — current session user. Doubles as a session probe. */
export const ME_ENDPOINT = '/users/me';
