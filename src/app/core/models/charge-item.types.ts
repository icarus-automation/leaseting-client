import type { BillType } from './enums';

export interface ChargeItemResponse {
  id: string;
  name: string;
  billType: BillType;
  defaultAmount: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChargeItemPayload {
  name: string;
  billType?: BillType;
  defaultAmount?: number | null;
}

export type UpdateChargeItemPayload = Partial<CreateChargeItemPayload>;

export interface ChargeLine {
  chargeItemId?: string;
  name: string;
  billType: BillType;
  description?: string;
  amount: number;
}
