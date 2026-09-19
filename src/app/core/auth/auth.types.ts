export interface SignInCredentials {
  email: string;
  password: string;
}

export interface FeatureFlags {
  sms: boolean;
}

export type Audience = 'staff' | 'tenant' | 'parking';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  organizationRole?: string | null;
  audience?: Audience;
  features?: FeatureFlags;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt?: string;
}

export interface SignInResponse {
  token?: string;
  user?: { id: string; name: string; email: string };
}
