import { convertToParamMap } from '@angular/router';
import { CalendarEntry } from '../../core/models/calendar.types';
import {
  ALL_EVENT_TYPES, CalendarState, calendarQueryParams, entrySource, entryTone,
  isCalendarDate, manilaToday, matchesCalendarFilters, nextManilaMidnight, readCalendarState,
} from './calendar-state';

describe('calendar state', () => {
  const defaults: CalendarState = {
    date: '2026-09-05', view: 'month', propertyId: '', q: '', types: [...ALL_EVENT_TYPES], scope: 'all',
  };
  const bill: CalendarEntry = {
    id: 'bill-due:bill-1', sourceId: 'bill-1', type: 'BILL_DUE', title: 'Rent due', date: '2026-09-04',
    status: 'OVERDUE', statusLabel: 'Overdue', leaseId: 'lease-1', amount: '8000.00', balance: '6000.00',
    tenant: { id: 'tenant-1', name: 'Mina Santos' }, unit: { id: 'unit-1', unitNo: '4B' },
    property: { id: 'property-1', name: 'Mabini Residences' },
  };

  it('defaults to agenda on compact screens while honoring an explicit view', () => {
    expect(readCalendarState(convertToParamMap({}), true).view).toBe('agenda');
    expect(readCalendarState(convertToParamMap({ view: 'month' }), true).view).toBe('month');
    expect(readCalendarState(convertToParamMap({}), false).view).toBe('month');
  });

  it('round-trips every filter, including intentionally hiding all types', () => {
    const state: CalendarState = { ...defaults, q: 'Mina 4B', types: [], scope: 'outstanding', view: 'week',
      propertyId: 'c8d12a5d-f07e-4b80-b1e6-d85e5b29cb94',
    };
    const params = Object.fromEntries(Object.entries(calendarQueryParams(state)).filter(([, value]) => value !== null));
    expect(readCalendarState(convertToParamMap(params), false)).toEqual(state);
  });

  it('recovers from malformed filters and removes duplicate types', () => {
    const state = readCalendarState(convertToParamMap({ view: 'random', property: 'invalid',
      types: 'BILL_DUE,BOGUS,BILL_DUE', scope: 'random',
    }), false);
    expect(state).toMatchObject({ view: 'month', propertyId: '', types: ['BILL_DUE'], scope: 'all' });
  });

  it('intersects entry types, outstanding balances and case-insensitive search words', () => {
    expect(matchesCalendarFilters(bill, { ...defaults, q: 'santos MABINI 4b' })).toBe(true);
    expect(matchesCalendarFilters(bill, { ...defaults, q: 'santos 5b' })).toBe(false);
    expect(matchesCalendarFilters(bill, { ...defaults, types: ['MOVE_IN'] })).toBe(false);
    expect(matchesCalendarFilters(bill, { ...defaults, types: [] })).toBe(false);
    expect(matchesCalendarFilters(bill, { ...defaults, scope: 'outstanding' })).toBe(true);
    expect(matchesCalendarFilters({ ...bill, balance: '0.00', status: 'PAID' }, { ...defaults, scope: 'outstanding' })).toBe(false);
    expect(matchesCalendarFilters({ ...bill, type: 'LEASE_END', balance: null }, { ...defaults, scope: 'outstanding' })).toBe(false);
  });

  it('counts each type independently of its toggle without dropping other filters', () => {
    expect(matchesCalendarFilters(bill, { ...defaults, types: [] }, false)).toBe(true);
    expect(matchesCalendarFilters(bill, { ...defaults, types: [], q: 'someone else' }, false)).toBe(false);
  });

  it('opens the exact source record for all entry types', () => {
    expect(entrySource(bill)).toMatchObject({ route: ['/bills'], queryParams: { billId: 'bill-1' } });
    expect(entrySource({ ...bill, type: 'MOVE_IN', sourceId: 'walk-1' }).route).toEqual(['/tenants', 'onboarding', 'walk-1']);
    for (const type of ['LEASE_START', 'LEASE_END'] as const) {
      expect(entrySource({ ...bill, type, sourceId: 'lease-1' }).route).toEqual(['/leases', 'lease-1']);
    }
  });

  it('maps color only to bill status and leaves all lease and onboarding milestones neutral', () => {
    expect(entryTone(bill)).toBe('destructive');
    expect(entryTone({ ...bill, status: 'PAID' })).toBe('success');
    expect(entryTone({ ...bill, status: 'DUE' })).toBe('warning');
    expect(entryTone({ ...bill, status: 'TODAY' })).toBe('warning');
    for (const type of ['LEASE_START', 'LEASE_END', 'MOVE_IN'] as const) {
      for (const status of ['TODAY', 'UPCOMING', 'OVERDUE', 'COMPLETED', 'TERMINATED', 'IN_PROGRESS'] as const) {
        expect(entryTone({ ...bill, type, status })).toBe('neutral');
      }
    }
  });

  it('schedules the next operational day at Manila midnight, including month and year boundaries', () => {
    expect(nextManilaMidnight(new Date('2026-09-04T15:59:59Z')).toISOString()).toBe('2026-09-04T16:00:00.000Z');
    expect(nextManilaMidnight(new Date('2026-09-04T16:00:00Z')).toISOString()).toBe('2026-09-05T16:00:00.000Z');
    expect(nextManilaMidnight(new Date('2026-09-30T15:59:59Z')).toISOString()).toBe('2026-09-30T16:00:00.000Z');
    expect(nextManilaMidnight(new Date('2026-12-31T16:00:00Z')).toISOString()).toBe('2027-01-01T16:00:00.000Z');
  });

  it('uses Manila days across UTC midnight without shifting date-only values', () => {
    expect(manilaToday(new Date('2026-09-04T16:00:00Z'))).toBe('2026-09-05');
    expect(manilaToday(new Date('2026-09-04T15:59:59Z'))).toBe('2026-09-04');
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2026-09-05T00:00:00Z')).toBe(false);
  });
});
