import { differenceInCalendarDays, differenceInCalendarMonths, setDate, startOfDay } from 'date-fns';

/**
 * A date-only API value as local midnight, accepting either shape the backend
 * sends. Prisma `@db.Date` columns (a bill's due date, a lease term) serialize
 * as a full ISO timestamp, so the same field arrives as "2026-10-10" from one
 * endpoint and "2026-10-10T00:00:00.000Z" from another. Appending a time to
 * the second shape yields an Invalid Date, which throws the moment date-fns
 * formats it. Taking the date part first is what makes both safe.
 */
export function parseApiDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

export function ordinal(day: number): string {
  const rem10 = day % 10;
  const rem100 = day % 100;
  if (rem10 === 1 && rem100 !== 11) return `${day}st`;
  if (rem10 === 2 && rem100 !== 12) return `${day}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${day}rd`;
  return `${day}th`;
}

export function daysUntil(isoDate: string): number {
  return differenceInCalendarDays(new Date(isoDate), startOfDay(new Date()));
}

export function isPastDue(isoDate: string): boolean {
  return daysUntil(isoDate) < 0;
}

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
