import { environment } from '../../../environments/environment';

export const API_BASE_URL = environment.apiBaseUrl;

export const AUTH_ENDPOINTS = {
  signInEmail: '/auth/sign-in/email',
  signOut: '/auth/sign-out',
  organizationList: '/auth/organization/list',
  setActiveOrganization: '/auth/organization/set-active',
} as const;

export const ME_ENDPOINT = '/users/me';
