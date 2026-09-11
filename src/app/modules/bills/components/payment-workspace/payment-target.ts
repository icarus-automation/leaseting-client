import type { BillDetail, BillListItem } from '../../../../core/models/bill.types';

/**
 * Which bill collection is against.
 * `seed` paints billed/paid/balance immediately.
 * A seed that already has a `payments` array skips the opening GET.
 */
export type PaymentTarget = {
  readonly billId: string;
  readonly seed?: BillListItem | BillDetail;
};

/** Where the Record payment control lives. Not page vs dialog. */
export type PaymentCta = 'inline' | 'host';

export function paymentTargetFromRow(bill: BillListItem): PaymentTarget {
  return { billId: bill.id, seed: bill };
}
