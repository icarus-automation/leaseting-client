import type { ParkingReportQuery, ShiftVarianceState } from '../../core/models/report.types';
import type { BadgeTone } from '../../shared/ui/status-badge/status-badge';
import { DateRange, DateRangePreset, resolvePreset, toIsoDate } from './date-range.util';

/**
 * What the three gate-cash reports are run over: a window, a property, and a
 * gate.
 *
 * Held as one object because the pages share a filter bar and a CSV file name,
 * and because the window's two ends must never drift out of step with the
 * preset that produced them.
 */
export interface ParkingReportScope {
  preset: DateRangePreset;
  range: DateRange;
  /** Empty string is "all", matching `ALL_PROPERTIES`. */
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

/**
 * Billed minutes as a guard would say them: "3h 20m", "45m".
 *
 * Parking is sold in hours and reads wrong in anything else. A stay printed as
 * "200 minutes" makes the reader do the division before they can check it
 * against the fee.
 */
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

/**
 * Over is not "fine".
 *
 * A guard handing in more than the tape says is as much a counting failure as
 * one handing in less, and calling only shortfalls out is how a systematic
 * overcharge at the barrier stays invisible. Both get a label of their own.
 */
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
