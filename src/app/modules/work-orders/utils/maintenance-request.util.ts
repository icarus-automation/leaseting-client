import type {
  MaintenanceRequest,
  MaintenanceRequestStatus,
} from '../../../core/models/maintenance-request.types';
import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';

export const RESOLVE_NOTE_MAX = 500;

export type RequestView = MaintenanceRequestStatus | 'ALL';

export type RequestAction = 'start' | 'resolve';

export function requestStatusBadge(status: MaintenanceRequestStatus): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'OPEN':
      return { label: 'Open', tone: 'warning' };
    case 'IN_PROGRESS':
      return { label: 'In progress', tone: 'neutral' };
    case 'RESOLVED':
      return { label: 'Resolved', tone: 'success' };
  }
}

export function nextRequestAction(status: MaintenanceRequestStatus): RequestAction | null {
  switch (status) {
    case 'OPEN':
      return 'start';
    case 'IN_PROGRESS':
      return 'resolve';
    default:
      return null;
  }
}

export function viewStatus(view: RequestView): MaintenanceRequestStatus | undefined {
  return view === 'ALL' ? undefined : view;
}

export function requestTenantName(request: Pick<MaintenanceRequest, 'tenant'>): string {
  return `${request.tenant.firstName} ${request.tenant.lastName}`.trim();
}

export function requestUnitLabel(request: Pick<MaintenanceRequest, 'unit'>): string {
  return `Unit ${request.unit.unitNo} · ${request.unit.property.name}`;
}

export function photoCountLabel(count: number): string {
  return count === 1 ? '1 photo' : `${count} photos`;
}

export function requestEmptyState(
  view: RequestView,
  propertyFiltered: boolean,
): { icon: string; heading: string; description: string } {
  const elsewhere = 'Nothing here for this property. Choose All properties to see the rest.';
  switch (view) {
    case 'OPEN':
      return {
        icon: 'inbox',
        heading: 'No open requests',
        description: propertyFiltered ? elsewhere : 'New requests from Residence Care show up here.',
      };
    case 'IN_PROGRESS':
      return {
        icon: 'wrench',
        heading: 'Nothing in progress',
        description: propertyFiltered
          ? elsewhere
          : 'Start an open request and it stays here until you resolve it.',
      };
    case 'RESOLVED':
      return {
        icon: 'check-circle',
        heading: 'No resolved requests',
        description: propertyFiltered
          ? elsewhere
          : 'Resolved requests stay here, with any note you left the tenant.',
      };
    default:
      return {
        icon: 'wrench',
        heading: 'No maintenance requests yet',
        description: propertyFiltered
          ? elsewhere
          : 'When a tenant files a request in Residence Care, it shows up here as Open.',
      };
  }
}
