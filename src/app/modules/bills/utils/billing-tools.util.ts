import type { MenuItem } from 'primeng/api';

export interface BillingToolsCommands {
  openSoaList: () => void;
  openGenerateSoa: () => void;
  openUtilityRun: () => void;
  generateRentBills: () => void;
}

/**
 * Periodic billing ops for the Bills header menu.
 *
 * New bill and Payment submissions stay out: create is a primary header
 * action, and submissions already has its own Money nav entry.
 */
export function billingToolsMenuItems(
  generatingRent: boolean,
  commands: BillingToolsCommands,
): MenuItem[] {
  return [
    { label: 'SOA', command: commands.openSoaList },
    { label: 'Generate SOA', command: commands.openGenerateSoa },
    { label: 'Utility run', command: commands.openUtilityRun },
    {
      label: 'Generate rent bills',
      disabled: generatingRent,
      command: commands.generateRentBills,
    },
  ];
}
