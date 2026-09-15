import type {
  MaintenanceRequest,
  MaintenanceRequestStatus,
} from '../../../core/models/maintenance-request.types';
import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';

/** The API caps a resolve note at 500 characters. */
export const RESOLVE_NOTE_MAX = 500;

/** A queue tab: one status, or every request. */
export type RequestView = MaintenanceRequestStatus | 'ALL';

export type RequestAction = 'start' | 'resolve';

/**
 * Open is the status that needs someone, so it alone carries the warning tone.
 * In progress is being handled and Resolved is done.
 */
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

/**
 * The one step staff can take from a status: Start from Open, Resolve from In
 * progress, nothing once Resolved. No skipping ahead and no going back.
 */
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

/** "Unit 106 · Brickstone Boarding House" */
export function requestUnitLabel(request: Pick<MaintenanceRequest, 'unit'>): string {
  return `Unit ${request.unit.unitNo} · ${request.unit.property.name}`;
}

export function photoCountLabel(count: number): string {
  return count === 1 ? '1 photo' : `${count} photos`;
}

/** What an empty tab says. A property filter gets its own line, since the org may have requests elsewhere. */
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
