import type { MenuItem } from 'primeng/api';

export interface BillingToolsCommands {
  openSoaList: () => void;
  openGenerateSoa: () => void;
  openUtilityRun: () => void;
  generateRentBills: () => void;
  generateAssociationDues: () => void;
}

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
    { label: 'Generate association dues', command: commands.generateAssociationDues },
  ];
}
