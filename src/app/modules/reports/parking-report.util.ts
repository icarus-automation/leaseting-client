import type { ParkingReportQuery, ShiftVarianceState } from '../../core/models/report.types';
import type { BadgeTone } from '../../shared/ui/status-badge/status-badge';
import { DateRange, DateRangePreset, resolvePreset, toIsoDate } from './date-range.util';

export interface ParkingReportScope {
  preset: DateRangePreset;
  range: DateRange;
  propertyId: string;
  terminalId: string;
}

export function defaultScope(): ParkingReportScope {
  const today = new Date();
  return {
    preset: 'this-month',
    range: resolvePreset('this-month', today) ?? { from: today, to: today },
    propertyId: '',
    terminalId: '',
  };
}

export function scopeQuery(scope: ParkingReportScope): ParkingReportQuery {
  return {
    from: toIsoDate(scope.range.from),
    to: toIsoDate(scope.range.to),
    propertyId: scope.propertyId || undefined,
    terminalId: scope.terminalId || undefined,
  };
}

const MINUTES_PER_HOUR = 60;

export function minutesLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / MINUTES_PER_HOUR);
  const rest = safe % MINUTES_PER_HOUR;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

export function varianceTone(state: ShiftVarianceState): BadgeTone {
  switch (state) {
    case 'short':
      return 'destructive';
    case 'over':
      return 'warning';
    default:
      return 'success';
  }
}

export function varianceStateLabel(state: ShiftVarianceState): string {
  switch (state) {
    case 'short':
      return 'Short';
    case 'over':
      return 'Over';
    default:
      return 'Balanced';
  }
}
