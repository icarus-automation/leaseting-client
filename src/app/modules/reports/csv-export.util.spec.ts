import { toCsv } from './csv-export.util';

describe('csv-export.util', () => {
  describe('toCsv', () => {
    it('joins plain cells without quoting them', () => {
      expect(toCsv([['Tenant', 'Date', 'Amount'], ['Ana Reyes', '2026-11-05', '10000.00']])).toBe(
        'Tenant,Date,Amount\r\nAna Reyes,2026-11-05,10000.00',
      );
    });

    it('quotes a cell containing a comma so the column count survives', () => {
      // A memo like this is ordinary; unquoted it would split into two columns.
      expect(toCsv([['Rent, water, and electricity']])).toBe('"Rent, water, and electricity"');
    });

    it('doubles embedded quotes', () => {
      expect(toCsv([['Paid via "GCash"']])).toBe('"Paid via ""GCash"""');
    });

    it('quotes cells with newlines rather than breaking the row', () => {
      expect(toCsv([['line one\nline two']])).toBe('"line one\nline two"');
    });

    it('writes null and undefined as empty cells, not the words', () => {
      expect(toCsv([['Ana Reyes', null, undefined, '']])).toBe('Ana Reyes,,,');
    });

    it('keeps numeric cells unquoted', () => {
      expect(toCsv([[1, 2.5, 0]])).toBe('1,2.5,0');
    });
  });
});
