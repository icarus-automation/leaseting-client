export type PortalAccessStatus = 'INACTIVE' | 'ACTIVE' | 'DISABLED' | 'MUST_CHANGE_PASSWORD';

export interface PortalAccessResponse {
  residentId: string;
  status: PortalAccessStatus;
  email: string | null;
  mustChangePassword: boolean;
  /**
   * When the tenant deleted their Residence Care account themselves. Set only
   * while they have no login (`INACTIVE`); setting up a new login clears it.
   */
  appAccountDeletedAt: string | null;
  temporaryPassword?: string;
}
