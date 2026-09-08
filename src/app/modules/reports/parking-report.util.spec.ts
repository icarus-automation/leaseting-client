import {
  ParkingReportScope,
  defaultScope,
  minutesLabel,
  scopeQuery,
  varianceStateLabel,
  varianceTone,
} from './parking-report.util';

const scope = (overrides: Partial<ParkingReportScope> = {}): ParkingReportScope => ({
  preset: 'custom',
  range: { from: new Date(2026, 8, 1, 12), to: new Date(2026, 8, 30, 12) },
  propertyId: '',
  terminalId: '',
  ...overrides,
});

describe('parking-report.util', () => {
  describe('defaultScope', () => {
    it('opens on the current month with no property or gate narrowing', () => {
      const opening = defaultScope();
      expect(opening.preset).toBe('this-month');
      expect(opening.propertyId).toBe('');
      expect(opening.terminalId).toBe('');
    });
  });

  describe('scopeQuery', () => {
    it('sends the window as the dates the reader picked, not their UTC shadow', () => {
      expect(scopeQuery(scope())).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
    });

    it('leaves an unset filter out rather than sending an empty string', () => {
      const query = scopeQuery(scope());
      expect(query.propertyId).toBeUndefined();
      expect(query.terminalId).toBeUndefined();
    });

    it('carries a chosen property and gate through', () => {
      const query = scopeQuery(scope({ propertyId: 'prop-1', terminalId: 'term-1' }));
      expect(query).toMatchObject({ propertyId: 'prop-1', terminalId: 'term-1' });
    });
  });

  describe('minutesLabel', () => {
    it('reads a short stay in minutes', () => {
      expect(minutesLabel(45)).toBe('45m');
    });

    it('reads a long stay in hours and minutes', () => {
      expect(minutesLabel(200)).toBe('3h 20m');
    });

    it('drops the minutes when a stay lands on the hour', () => {
      expect(minutesLabel(120)).toBe('2h');
    });

    it('clamps a negative to zero rather than printing a stay that ran backwards', () => {
      expect(minutesLabel(-5)).toBe('0m');
    });
  });

  describe('variance labelling', () => {
    it('calls an overage out as loudly as a shortfall', () => {
      expect(varianceStateLabel('short')).toBe('Short');
      expect(varianceStateLabel('over')).toBe('Over');
      expect(varianceTone('short')).toBe('destructive');
      expect(varianceTone('over')).toBe('warning');
    });

    it('reserves the calm tone for a till that matched exactly', () => {
      expect(varianceStateLabel('balanced')).toBe('Balanced');
      expect(varianceTone('balanced')).toBe('success');
    });
  });
});
