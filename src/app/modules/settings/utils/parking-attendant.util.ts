import type { ParkingAttendantResponse, ParkingAttendantStatus } from '../../../core/models/parking-attendant.types';
import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';

export function parkingAttendantBadge(status: ParkingAttendantStatus): {
  label: string;
  tone: BadgeTone;
} {
  return status === 'DISABLED'
    ? { label: 'Disabled', tone: 'destructive' }
    : { label: 'Active', tone: 'success' };
}

export function sortAttendants(attendants: ParkingAttendantResponse[]): ParkingAttendantResponse[] {
  return [...attendants].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'ACTIVE' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
