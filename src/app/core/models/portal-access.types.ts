export type PortalAccessStatus = 'INACTIVE' | 'ACTIVE' | 'DISABLED' | 'MUST_CHANGE_PASSWORD';

export interface PortalAccessResponse {
  tenantId: string;
  status: PortalAccessStatus;
  email: string | null;
  mustChangePassword: boolean;
  temporaryPassword?: string;
}
