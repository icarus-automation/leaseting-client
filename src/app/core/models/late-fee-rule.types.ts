import type { BillType } from './enums';

export type LateFeeBasis = 'FIXED' | 'PERCENT';

export const LATE_FEE_BASIS_OPTIONS: { value: LateFeeBasis; label: string }[] = [
  { value: 'FIXED', label: 'Fixed' },
  { value: 'PERCENT', label: '% of balance' },
];

export type LateFeeAmount =
  | { kind: 'FIXED'; amount: string }
  | { kind: 'PERCENT'; percent: string };

export interface LateFeeChargeItemRef {
  id: string;
  name: string;
  billType: BillType;
  isArchived: boolean;
}

export type LateFeeRuleResponse =
  | {
      mode: 'OFF';
      graceDays: number;
      fee: LateFeeAmount | null;
      chargeItem: LateFeeChargeItemRef | null;
      updatedAt: string | null;
    }
  | {
      mode: 'ON';
      graceDays: number;
      fee: LateFeeAmount;
      chargeItem: LateFeeChargeItemRef;
      updatedAt: string;
    };

export type UpdateLateFeeRulePayload =
  | { mode: 'OFF' }
  | {
      mode: 'ON';
      graceDays: number;
      chargeItemId: string;
      fee: { kind: 'FIXED'; amount: number } | { kind: 'PERCENT'; percent: number };
    };
