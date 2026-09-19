import {
  endOfMonth,
  endOfQuarter,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
} from 'date-fns';

import { parseApiDate } from '../../shared/utils/date.util';

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

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function rangeLabel(fromIso: string, toIso: string): string {
  const from = parseApiDate(fromIso);
  const to = parseApiDate(toIso);
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${format(from, sameYear ? 'd MMM' : 'd MMM yyyy')} to ${format(to, 'd MMM yyyy')}`;
}

function earlierOf(a: Date, b: Date): Date {
  return a < b ? a : b;
}
