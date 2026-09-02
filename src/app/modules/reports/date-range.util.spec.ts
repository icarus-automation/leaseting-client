import { rangeLabel, resolvePreset, toIsoDate } from './date-range.util';

// Local noon keeps the fixture clear of the timezone edges the util guards.
const today = new Date(2026, 7, 4, 12, 0, 0); // 4 Aug 2026

describe('date-range.util', () => {
  describe('resolvePreset', () => {
    it('runs this month from the 1st up to today, not month end', () => {
      const range = resolvePreset('this-month', today)!;
      expect(toIsoDate(range.from)).toBe('2026-08-01');
      expect(toIsoDate(range.to)).toBe('2026-08-04');
    });

    it('covers last month end to end', () => {
      const range = resolvePreset('last-month', today)!;
      expect(toIsoDate(range.from)).toBe('2026-07-01');
      expect(toIsoDate(range.to)).toBe('2026-07-31');
    });

    it('clips the current quarter at today rather than running into the future', () => {
      const range = resolvePreset('this-quarter', today)!;
      expect(toIsoDate(range.from)).toBe('2026-07-01');
      expect(toIsoDate(range.to)).toBe('2026-08-04');
    });

    it('runs year to date from 1 January', () => {
      const range = resolvePreset('year-to-date', today)!;
      expect(toIsoDate(range.from)).toBe('2026-01-01');
      expect(toIsoDate(range.to)).toBe('2026-08-04');
    });

    it('leaves custom to the pickers', () => {
      expect(resolvePreset('custom', today)).toBeNull();
    });

    it('rolls last month back across a year boundary', () => {
      const range = resolvePreset('last-month', new Date(2026, 0, 15, 12))!;
      expect(toIsoDate(range.from)).toBe('2025-12-01');
      expect(toIsoDate(range.to)).toBe('2025-12-31');
    });
  });

  describe('toIsoDate', () => {
    it('keeps the calendar day the user picked, even late in the evening', () => {
      expect(toIsoDate(new Date(2026, 10, 5, 23, 45))).toBe('2026-11-05');
    });
  });

  describe('rangeLabel', () => {
    it('states the year once when both ends share it', () => {
      expect(rangeLabel('2026-11-01', '2026-11-30')).toBe('1 Nov to 30 Nov 2026');
    });

    it('spells out both years when the range crosses one', () => {
      expect(rangeLabel('2025-12-01', '2026-01-31')).toBe('1 Dec 2025 to 31 Jan 2026');
    });
  });
});
