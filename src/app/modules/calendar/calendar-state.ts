import { ParamMap } from '@angular/router';
import type { CalendarEntry, CalendarEventType } from '../../core/models/calendar.types';
import type { BadgeTone } from '../../shared/ui/status-badge/status-badge';

export const EVENT_TYPES: { value: CalendarEventType; label: string; icon: string }[] = [
  { value: 'BILL_DUE', label: 'Bills due', icon: 'wallet' },
  { value: 'LEASE_END', label: 'Lease ends', icon: 'file-edit' },
  { value: 'LEASE_START', label: 'Lease starts', icon: 'key' },
  { value: 'MOVE_IN', label: 'Planned move-ins', icon: 'sign-in' },
];
export const ALL_EVENT_TYPES = EVENT_TYPES.map((type) => type.value);
export type CalendarView = 'month' | 'week' | 'agenda';
export type CalendarScope = 'all' | 'outstanding';
export interface CalendarState {
  date: string;
  view: CalendarView;
  propertyId: string;
  q: string;
  types: CalendarEventType[];
  scope: CalendarScope;
}

export function manilaToday(now = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function nextManilaMidnight(now = new Date()): Date {
  return new Date(new Date(`${manilaToday(now)}T00:00:00+08:00`).getTime() + 86_400_000);
}

export function isCalendarDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function readCalendarState(params: ParamMap, compact: boolean): CalendarState {
  const date = params.get('date');
  const view = params.get('view');
  const typeParam = params.get('types');
  const requested = (typeParam ?? '').split(',');
  const validTypes = ALL_EVENT_TYPES.filter((type) => requested.includes(type));
  const property = params.get('property') ?? '';
  return {
    date: isCalendarDate(date) ? date : manilaToday(),
    view: view === 'month' || view === 'week' || view === 'agenda' ? view : compact ? 'agenda' : 'month',
    propertyId: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(property) ? property : '',
    q: (params.get('q') ?? '').trim().slice(0, 120),
    // Explicit none survives reload; malformed links recover to the useful default.
    types: typeParam === 'none' ? [] : validTypes.length ? validTypes : [...ALL_EVENT_TYPES],
    scope: params.get('scope') === 'outstanding' ? 'outstanding' : 'all',
  };
}

export function calendarQueryParams(state: CalendarState) {
  return {
    date: state.date, view: state.view,
    property: state.propertyId || null, q: state.q || null,
    types: state.types.length === ALL_EVENT_TYPES.length ? null : state.types.join(',') || 'none',
    scope: state.scope === 'all' ? null : state.scope,
  };
}

export function matchesCalendarFilters(entry: CalendarEntry, state: CalendarState, includeTypes = true): boolean {
  if (includeTypes && !state.types.includes(entry.type)) return false;
  if (state.scope === 'outstanding' && (entry.type !== 'BILL_DUE' || Number(entry.balance) <= 0)) return false;
  const haystack = `${entry.title} ${entry.tenant?.name ?? ''} ${entry.unit.unitNo} ${entry.property.name}`.toLocaleLowerCase();
  return state.q.toLocaleLowerCase().split(/\s+/).every((word) => haystack.includes(word));
}

export function entryTone(entry: CalendarEntry): BadgeTone {
  // Calendar color describes bill payment status only; milestone dates stay neutral.
  if (entry.type !== 'BILL_DUE') return 'neutral';
  if (entry.status === 'OVERDUE') return 'destructive';
  if (entry.status === 'PAID') return 'success';
  if (entry.status === 'TODAY' || entry.status === 'DUE') return 'warning';
  return 'neutral';
}

export function entrySource(entry: CalendarEntry): { route: string[]; queryParams: Record<string, string>; label: string } {
  if (entry.type === 'BILL_DUE') {
    return { route: ['/bills'], queryParams: { billId: entry.sourceId }, label: 'Open bill' };
  }
  if (entry.type === 'MOVE_IN') {
    return { route: ['/tenants', 'onboarding', entry.sourceId], queryParams: {}, label: 'Open onboarding' };
  }
  return { route: ['/leases', entry.sourceId], queryParams: {}, label: 'Open lease' };
}
