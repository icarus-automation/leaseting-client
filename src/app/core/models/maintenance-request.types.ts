export type MaintenanceRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface MaintenanceRequestActor {
  id: string;
  name: string;
}

export interface MaintenanceRequest {
  id: string;
  title: string;
  notes: string;
  status: MaintenanceRequestStatus;
  photoUrls: string[];
  resolveNote: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  leaseId: string;
  tenant: { id: string; firstName: string; lastName: string };
  unit: { id: string; unitNo: string; property: { id: string; name: string } };
}

export interface StaffMaintenanceRequest extends MaintenanceRequest {
  startedBy: MaintenanceRequestActor | null;
  resolvedBy: MaintenanceRequestActor | null;
}

export interface MaintenanceRequestFilters {
  page?: number;
  limit?: number;
  status?: MaintenanceRequestStatus;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
}
