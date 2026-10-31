import type { Audience } from '../auth/auth.types';

export interface CatalogPermission {
  code: string;
  label: string;
  description: string;
  /** Property-bound: a later phase narrows it to a person's assigned properties. */
  scopable: boolean;
  /** A custom role may hold it. */
  grantable: boolean;
}

export interface CatalogGroup {
  id: string;
  label: string;
  permissions: CatalogPermission[];
}

export interface CatalogRole {
  id: 'owner' | 'admin' | 'member' | 'tenant' | 'parking_attendant';
  label: string;
  description: string;
  audience: Audience;
  permissions: string[];
}

export interface AccessCatalog {
  groups: CatalogGroup[];
  roles: CatalogRole[];
}
