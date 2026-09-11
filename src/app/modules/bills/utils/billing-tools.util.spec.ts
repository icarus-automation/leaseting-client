import { describe, expect, it, vi } from 'vitest';

import { billingToolsMenuItems } from './billing-tools.util';

const commands = {
  openSoaList: vi.fn(),
  openGenerateSoa: vi.fn(),
  openUtilityRun: () => undefined,
  generateRentBills: vi.fn(),
};

describe('billingToolsMenuItems', () => {
  it('lists SOA, generate, utility, and rent run — not New bill or submissions', () => {
    const labels = billingToolsMenuItems(false, commands).map((item) => item.label);
    expect(labels).toEqual(['SOA', 'Generate SOA', 'Utility run', 'Generate rent bills']);
    expect(labels).not.toContain('New bill');
    expect(labels).not.toContain('Submissions');
  });

  it('disables Generate rent bills while a run is in flight', () => {
    expect(billingToolsMenuItems(true, commands)[3]?.disabled).toBe(true);
    expect(billingToolsMenuItems(false, commands)[3]?.disabled).toBe(false);
  });
});
