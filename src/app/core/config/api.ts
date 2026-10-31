import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const AUTH_ENDPOINTS = {
  signInEmail: '/auth/sign-in/email',
  signInSocial: '/auth/sign-in/social',
  signOut: '/auth/sign-out',
  getSession: '/auth/get-session',
  organizationList: '/auth/organization/list',
  setActiveOrganization: '/auth/organization/set-active',
} as const;

export const ME_ENDPOINT = '/users/me';

/** Public: the accept-invite page calls them before anyone is signed in. */
export const INVITATION_ENDPOINTS = {
  preview: '/invitations/preview',
  accept: '/invitations/accept',
} as const;
