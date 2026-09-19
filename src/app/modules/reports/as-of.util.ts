import { endOfMonth, endOfQuarter, endOfYear, format, subMonths, subQuarters, subYears } from 'date-fns';

import { parseApiDate } from '../../shared/utils/date.util';


export type AsOfPreset = 'today' | 'last-month-end' | 'last-quarter-end' | 'last-year-end' | 'custom';

export const AS_OF_PRESETS: { value: AsOfPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last-month-end', label: 'End of last month' },
  { value: 'last-quarter-end', label: 'End of last quarter' },
  { value: 'last-year-end', label: 'End of last year' },
  { value: 'custom', label: 'Pick a date' },
];

export interface AsOfSelection {
  preset: AsOfPreset;
  date: Date;
}

export function resolveAsOf(preset: AsOfPreset, today = new Date()): Date | null {
  switch (preset) {
    case 'today':
      return today;
    case 'last-month-end':
      return endOfMonth(subMonths(today, 1));
    case 'last-quarter-end':
      return endOfQuarter(subQuarters(today, 1));
    case 'last-year-end':
      return endOfYear(subYears(today, 1));
    case 'custom':
      return null;
  }
}

export function todaySelection(today = new Date()): AsOfSelection {
  return { preset: 'today', date: today };
}

export function asOfParam(selection: AsOfSelection): string | undefined {
  return selection.preset === 'today' ? undefined : toIsoDate(selection.date);
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function asOfLabel(iso: string): string {
  return format(parseApiDate(iso), 'd MMM yyyy');
}
