import type {
  ParkingOverviewSession,
  ParkingOverviewShift,
  ParkingSessionStatus,
  ParkingShiftStatus,
} from '../../../core/models/parking-overview.types';
import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

export function elapsedLabel(fromIso: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(fromIso));
  const hours = Math.floor(elapsed / HOUR_MS);
  const minutes = Math.floor((elapsed % HOUR_MS) / MINUTE_MS);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function elapsedMinutes(fromIso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(fromIso)) / MINUTE_MS));
}

export const LONG_STAY_MINUTES = 12 * 60;

export function sessionBadge(status: ParkingSessionStatus): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'PAID':
      return { label: 'Paid exit', tone: 'success' };
    case 'VOID':
      return { label: 'Voided', tone: 'destructive' };
    default:
      return { label: 'In park', tone: 'neutral' };
  }
}

export function shiftBadge(status: ParkingShiftStatus): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'DECLARED':
      return { label: 'Awaiting confirm', tone: 'warning' };
    case 'CONFIRMED':
      return { label: 'Confirmed', tone: 'success' };
    default:
      return { label: 'Open', tone: 'neutral' };
  }
}

export type VarianceState = 'balanced' | 'short' | 'over' | 'pending';

export function varianceState(variance: string | null): VarianceState {
  if (variance === null) return 'pending';
  const amount = Number(variance);
  if (Number.isNaN(amount) || amount === 0) return 'balanced';
  return amount < 0 ? 'short' : 'over';
}

export function varianceLabel(variance: string | null): string {
  const state = varianceState(variance);
  if (state === 'pending') return 'Not declared';
  if (state === 'balanced') return 'Balanced';
  const amount = Number(variance);
  const magnitude = Math.abs(amount).toFixed(2);
  return state === 'short' ? `Short ${magnitude}` : `Over ${magnitude}`;
}

export function canVoid(session: ParkingOverviewSession, isFinancialAdmin: boolean): boolean {
  return session.status === 'OPEN' && isFinancialAdmin;
}

export function canConfirm(shift: ParkingOverviewShift, isFinancialAdmin: boolean): boolean {
  return shift.status === 'DECLARED' && isFinancialAdmin;
}
