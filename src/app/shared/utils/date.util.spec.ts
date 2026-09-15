import { describe, expect, it } from 'vitest';

import { parseApiDate } from './date.util';

/*
 * The backend keeps date-only columns as Prisma `@db.Date` and serializes them
 * as full ISO timestamps, so a field arrives in either shape depending on the
 * endpoint. Tolerating both here is the agreed seam: the wire format stays as
 * it is, and nothing downstream has to know which shape it got.
 */
describe('parseApiDate', () => {
  it('reads a date-only value as local midnight', () => {
    const date = parseApiDate('2026-09-01');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
  });

  it('reads a full ISO timestamp as the same local midnight', () => {
    expect(parseApiDate('2026-09-01T00:00:00.000Z').getTime()).toBe(
      parseApiDate('2026-09-01').getTime(),
    );
  });

  it('never returns an Invalid Date for either shape', () => {
    expect(Number.isNaN(parseApiDate('2026-10-10T00:00:00.000Z').getTime())).toBe(false);
    expect(Number.isNaN(parseApiDate('2026-10-10').getTime())).toBe(false);
  });
});
