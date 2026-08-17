import { differenceInCalendarDays, differenceInCalendarMonths, setDate, startOfDay } from 'date-fns';

/** 1 → "1st", 2 → "2nd", 15 → "15th" — used for "Every 5th of the month". */
export function ordinal(day: number): string {
  const rem10 = day % 10;
  const rem100 = day % 100;
  if (rem10 === 1 && rem100 !== 11) return `${day}st`;
  if (rem10 === 2 && rem100 !== 12) return `${day}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${day}rd`;
  return `${day}th`;
}

/** Whole calendar days from today until the ISO date (negative = past). */
export function daysUntil(isoDate: string): number {
  return differenceInCalendarDays(new Date(isoDate), startOfDay(new Date()));
}

/** True when the ISO date is strictly before today (time-of-day ignored). */
export function isPastDue(isoDate: string): boolean {
  return daysUntil(isoDate) < 0;
}

/** Human lease length from its start/end dates, e.g. "5 years", "1 year 3 months". */
export function leaseTermLabel(startIso: string, endIso: string): string {
  const months = differenceInCalendarMonths(new Date(endIso), new Date(startIso));
  if (months < 1) return 'Under a month';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (rest > 0) parts.push(`${rest} month${rest === 1 ? '' : 's'}`);
  return parts.join(' ');
}

/**
 * Next occurrence of a lease's due day: this month if still ahead, else next
 * month; the day clamps to the month's length (31st → Feb 28).
 */
export function nextDueDate(dueDay: number, from = new Date()): Date {
  const today = startOfDay(from);
  const clamp = (base: Date) => setDate(base, Math.min(dueDay, daysInMonth(base)));
  const candidate = clamp(today);
  if (candidate > today) return candidate;
  return clamp(new Date(today.getFullYear(), today.getMonth() + 1, 1));
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
