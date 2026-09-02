import { describe, expect, it } from 'vitest';

import { asOfLabel, asOfParam, resolveAsOf, toIsoDate, todaySelection } from './as-of.util';

/** Mid-month, mid-quarter — so every period-end lands somewhere different. */
const TODAY = new Date(2026, 7, 5); // 5 Aug 2026, local time

describe('as-of.util', () => {
  describe('resolveAsOf', () => {
    it('resolves today to today', () => {
      expect(toIsoDate(resolveAsOf('today', TODAY)!)).toBe('2026-08-05');
    });

    it('resolves to the last day of the previous month', () => {
      expect(toIsoDate(resolveAsOf('last-month-end', TODAY)!)).toBe('2026-07-31');
    });

    it('resolves to the last day of the previous quarter', () => {
      expect(toIsoDate(resolveAsOf('last-quarter-end', TODAY)!)).toBe('2026-06-30');
    });

    it('resolves to the last day of the previous year', () => {
      expect(toIsoDate(resolveAsOf('last-year-end', TODAY)!)).toBe('2025-12-31');
    });

    it('leaves custom to the date picker', () => {
      expect(resolveAsOf('custom', TODAY)).toBeNull();
    });

    it('crosses a year boundary without slipping', () => {
      const january = new Date(2026, 0, 14);
      expect(toIsoDate(resolveAsOf('last-month-end', january)!)).toBe('2025-12-31');
    });
  });

  describe('toIsoDate', () => {
    it('keeps the calendar day the user picked, not its UTC shadow', () => {
      // Late evening east of UTC formats as the next day if read as UTC.
      expect(toIsoDate(new Date(2026, 10, 30, 23, 30))).toBe('2026-11-30');
    });

    it('keeps an early-morning date on its own day', () => {
      expect(toIsoDate(new Date(2026, 10, 1, 0, 15))).toBe('2026-11-01');
    });
  });

  describe('asOfParam', () => {
    it('sends nothing for Today, so the server dates the report', () => {
      expect(asOfParam(todaySelection(TODAY))).toBeUndefined();
    });

    it('sends the picked date for every other option', () => {
      expect(asOfParam({ preset: 'last-month-end', date: new Date(2026, 6, 31) })).toBe('2026-07-31');
      expect(asOfParam({ preset: 'custom', date: new Date(2026, 6, 4) })).toBe('2026-07-04');
    });
  });

  describe('todaySelection', () => {
    it('opens on Today, carrying the date for labels and links', () => {
      expect(todaySelection(TODAY)).toEqual({ preset: 'today', date: TODAY });
    });
  });

  describe('asOfLabel', () => {
    it('reads an ISO date back as a date a person would say', () => {
      expect(asOfLabel('2026-11-30')).toBe('30 Nov 2026');
    });

    it('does not shift the day west of UTC', () => {
      expect(asOfLabel('2026-01-01')).toBe('1 Jan 2026');
    });
  });
});
