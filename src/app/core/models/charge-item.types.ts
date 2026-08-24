import type { BillType } from './enums';

/**
 * Org-curated catalogue of things a lease can be charged for — the picker
 * behind the onboarding wizard's rent-charge and deposit lines, managed from
 * Settings → Charge items. Archived items stay on leases that already use
 * them but are hidden from the pickers.
 */
export interface ChargeItemResponse {
  id: string;
  name: string;
  /** The Bill bucket lines built from this item post into. */
  billType: BillType;
  /** Prisma Decimal — serialized as a string; null when there is no default. */
  defaultAmount: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChargeItemPayload {
  name: string;
  billType?: BillType;
  /** `null` clears an existing default. */
  defaultAmount?: number | null;
}

export type UpdateChargeItemPayload = Partial<CreateChargeItemPayload>;

/**
 * One money line on a lease. `name` and `billType` are snapshotted when the
 * line is added, so renaming or archiving the catalogue item afterwards never
 * rewrites a lease that already went out.
 */
export interface ChargeLine {
  chargeItemId?: string;
  name: string;
  billType: BillType;
  description?: string;
  amount: number;
}
