import type { BillType } from './enums';

/** MONTHLY items make up a lease's rent; ONE_TIME items (deposits, fees) are billed once. */
export type ChargeFrequency = 'MONTHLY' | 'ONE_TIME';

export const CHARGE_FREQUENCY_LABELS: Record<ChargeFrequency, string> = {
  MONTHLY: 'Monthly',
  ONE_TIME: 'One-time',
};

export const CHARGE_FREQUENCY_OPTIONS = (
  Object.entries(CHARGE_FREQUENCY_LABELS) as [ChargeFrequency, string][]
).map(([value, label]) => ({ value, label }));

export type ChargeItemSystemKey = 'LATE_FEE' | 'SECURITY_DEPOSIT';

/** What Leaseting bills as each system item, shown where the item is locked. */
export const SYSTEM_ITEM_PURPOSE: Record<ChargeItemSystemKey, string> = {
  LATE_FEE: 'late fees post as it',
  SECURITY_DEPOSIT: 'the onboarding deposit step bills as it',
};

/** The lock note for a system item; an older API without systemKey is the Late fee. */
export function systemItemPurpose(item: Pick<ChargeItemResponse, 'systemKey'>): string {
  return SYSTEM_ITEM_PURPOSE[item.systemKey ?? 'LATE_FEE'];
}

export interface ChargeItemResponse {
  id: string;
  name: string;
  billType: BillType;
  defaultAmount: string | null;
  isArchived: boolean;
  frequency: ChargeFrequency;
  /** The Late fee: created by Leaseting, locked, and never offered in a charge picker. */
  isSystem: boolean;
  /** Which system item it is: LATE_FEE or SECURITY_DEPOSIT. */
  systemKey?: ChargeItemSystemKey | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChargeItemPayload {
  name: string;
  billType?: BillType;
  defaultAmount?: number | null;
  frequency?: ChargeFrequency;
}

export type UpdateChargeItemPayload = Partial<CreateChargeItemPayload>;

export interface ChargeLine {
  chargeItemId?: string;
  name: string;
  billType: BillType;
  description?: string;
  amount: number;
}
