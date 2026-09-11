import type { BillDetail, BillListItem, PaymentResponse } from '../../../../core/models/bill.types';

export type PaymentTarget = {
  readonly billId: string;
  readonly seed?: BillListItem | BillDetail;
  readonly history?: readonly PaymentResponse[];
};

export type PaymentCta = 'body' | 'footer';

export function paymentTargetFromRow(bill: BillListItem | BillDetail): PaymentTarget {
  return {
    billId: bill.id,
    seed: bill,
    ...('payments' in bill ? { history: bill.payments } : {}),
  };
}
