import {
  endOfMonth,
  endOfQuarter,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from 'date-fns';

export type DateRangePreset = 'this-month' | 'last-month' | 'this-quarter' | 'year-to-date' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'this-quarter', label: 'This quarter' },
  { value: 'year-to-date', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Resolves a preset against today. Returns null for `custom`, where the dates
 * come from the pickers instead.
 *
 * Ranges that would run past today are clipped to it — a report whose window
 * extends into the future invites the reader to treat a partial month as a
 * finished one.
 */
export function resolvePreset(preset: DateRangePreset, today = new Date()): DateRange | null {
  switch (preset) {
    case 'this-month':
      return { from: startOfMonth(today), to: today };
    case 'last-month': {
      const previous = subMonths(today, 1);
      return { from: startOfMonth(previous), to: endOfMonth(previous) };
    }
    case 'this-quarter':
      return { from: startOfQuarter(today), to: earlierOf(endOfQuarter(today), today) };
    case 'year-to-date':
      return { from: startOfYear(today), to: today };
    case 'custom':
      return null;
  }
}

/** yyyy-MM-dd in the user's own calendar — the day they picked, not UTC's. */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** "1 Nov – 30 Nov 2026", collapsing the year when both ends share it. */
export function rangeLabel(fromIso: string, toIso: string): string {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${format(from, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${format(to, 'd MMM yyyy')}`;
}

function earlierOf(a: Date, b: Date): Date {
  return a < b ? a : b;
}
