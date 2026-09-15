/**
 * Maintenance requests, as `docs/fe-maintenance-request-api.md` defines them.
 * A tenant files one from Residence Care; staff move it Open, In progress,
 * Resolved from Work Orders. Nothing else changes a request.
 */
export type MaintenanceRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface MaintenanceRequestActor {
  id: string;
  name: string;
}

/** The record both apps receive. */
export interface MaintenanceRequest {
  id: string;
  /** Trimmed, 1 to 120 chars. */
  title: string;
  /** Trimmed, 1 to 2000 chars. */
  notes: string;
  status: MaintenanceRequestStatus;
  /** 0 to 3 absolute URLs in upload order. Private: load them with the session cookie. */
  photoUrls: string[];
  /** Set only by Resolve, max 500 chars. The tenant sees it. */
  resolveNote: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  /** When the tenant filed it. */
  createdAt: string;
  updatedAt: string;
  /** Lease in force when filed. */
  leaseId: string;
  tenant: { id: string; firstName: string; lastName: string };
  unit: { id: string; unitNo: string; property: { id: string; name: string } };
}

/** The staff shape: adds who started and who resolved it. */
export interface StaffMaintenanceRequest extends MaintenanceRequest {
  startedBy: MaintenanceRequestActor | null;
  resolvedBy: MaintenanceRequestActor | null;
}

export interface MaintenanceRequestFilters {
  page?: number;
  /** The API caps a page at 50. */
  limit?: number;
  status?: MaintenanceRequestStatus;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
}
