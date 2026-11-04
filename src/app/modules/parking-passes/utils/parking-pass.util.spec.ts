import {
  BILL_PAID_REFUND_MESSAGE,
  canBillByHand,
  formatPassDay,
  passPaymentOptions,
  passStatus,
  paymentRemainingCents,
  paymentsWithRemainder,
  refundErrorMessage,
  refundablePayments,
  reviewReasonLabel,
  waitingBill,
  withBillingDefaults,
} from './parking-pass.util';
import type { ParkingPass, ParkingPassBill, ParkingPassPayment } from '../../../core/models/parking-pass.types';
import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';

function destination(overrides: Partial<PaymentDestinationResponse>): PaymentDestinationResponse {
  return {
    id: 'dest-1',
    displayName: 'GCash',
    method: 'GCASH',
    accountName: 'Leaseting',
    accountNumber: '0917',
    instructions: null,
    isEnabled: true,
    displayOrder: 0,
    propertyId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('parking pass display', () => {
  it('formats a paid-through date on the calendar day it names', () => {
    expect(formatPassDay('2026-03-10')).toBe('Mar 10, 2026');
  });

  it('reads valid, lapsed, and ended from the pass', () => {
    expect(passStatus({ valid: true, endedAt: null }).label).toBe('Valid');
    expect(passStatus({ valid: false, endedAt: null }).label).toBe('Lapsed');
    expect(passStatus({ valid: false, endedAt: '2026-03-01T00:00:00.000Z' }).label).toBe('Ended');
  });

  it('keeps the unpaid remainder of a payment in cents', () => {
    expect(paymentRemainingCents({ amount: '1500.00', refundedAmount: '500.00' })).toBe(100000);
  });

  it('offers cash and the property destinations', () => {
    const options = passPaymentOptions(
      [destination({ id: 'gcash', displayName: 'GCash', propertyId: 'prop-a' }), destination({ id: 'other', propertyId: 'prop-b' })],
      'prop-a',
    );
    expect(options.map((option) => option.label)).toEqual(['Cash', 'GCash']);
  });
});

describe('parking pass billing display', () => {
  const bill = (overrides: Partial<ParkingPassBill> = {}): ParkingPassBill => ({
    id: 'bill-1',
    amount: '1500.00',
    paidAmount: '0.00',
    balance: '1500.00',
    dueDate: '2026-03-10',
    billingPeriod: '2026-03-11',
    needsReview: false,
    reviewReason: null,
    ...overrides,
  });
  const payment = (overrides: Partial<ParkingPassPayment>): ParkingPassPayment => ({
    id: 'pay-1',
    amount: '1500.00',
    periodStart: '2026-02-10',
    periodEnd: '2026-03-10',
    method: 'CASH',
    destinationId: null,
    destinationName: null,
    takenById: 'user-1',
    shiftId: null,
    billId: null,
    refundedAmount: '0.00',
    refunds: [],
    createdAt: '2026-02-10T02:00:00.000Z',
    ...overrides,
  });

  it('offers only months paid at the terminal or office for a refund', () => {
    const refundable = refundablePayments({
      payments: [
        payment({ id: 'cash' }),
        payment({ id: 'through-bill', billId: 'bill-9' }),
        payment({ id: 'spent', refundedAmount: '1500.00' }),
      ],
    });
    expect(refundable.map((row) => row.id)).toEqual(['cash']);
  });

  it('reads the waiting bill and leaves a flagged one out', () => {
    expect(waitingBill({ openBills: [bill({ id: 'flagged', needsReview: true }), bill({ id: 'next' })] })?.id).toBe('next');
    expect(waitingBill({ openBills: [bill({ needsReview: true, reviewReason: 'auto-renew-off' })] })).toBeNull();
    expect(reviewReasonLabel('month-covered')).toBe('That month is already paid');
  });

  it('lets an admin bill by hand only on an open linked pass with auto-renew off and no waiting bill', () => {
    const base = { leaseId: 'lease-1', ownershipId: null, endedAt: null, autoRenew: false, openBills: [] as ParkingPassBill[] };
    expect(canBillByHand(base)).toBe(true);
    expect(canBillByHand({ ...base, autoRenew: true })).toBe(false);
    expect(canBillByHand({ ...base, leaseId: null })).toBe(false);
    expect(canBillByHand({ ...base, endedAt: '2026-03-01T00:00:00.000Z' })).toBe(false);
    expect(canBillByHand({ ...base, openBills: [bill()] })).toBe(false);
  });
});

describe('parking pass rollout', () => {
  it('fills the billing fields an older API leaves out, so refunds and the billing column still work', () => {
    const older = {
      id: 'pass-1',
      leaseId: 'lease-1',
      ownershipId: null,
      endedAt: null,
      payments: [{ id: 'pay-1', amount: '1500.00', refundedAmount: '0.00' }],
    } as unknown as ParkingPass;

    const pass = withBillingDefaults(older);

    expect(pass.autoRenew).toBe(false);
    expect(pass.openBills).toEqual([]);
    expect(pass.payments[0].billId).toBeNull();
    expect(refundablePayments(pass).map((payment) => payment.id)).toEqual(['pay-1']);
    expect(waitingBill(pass)).toBeNull();
  });
});

describe('refunding a bill-paid month', () => {
  const refusal = {
    status: 409,
    error: {
      statusCode: 409,
      message: "This month was paid through a bill. Bill refunds aren't supported yet.",
      error: 'Conflict',
      code: 'BILL_PAID_REFUND_UNSUPPORTED',
    },
  };

  it('shows the API message for the coded refusal, not a generic error', () => {
    expect(refundErrorMessage(refusal)).toBe(BILL_PAID_REFUND_MESSAGE);
    expect(BILL_PAID_REFUND_MESSAGE).toBe(refusal.error.message);
  });

  it('keeps the API wording for other refusals and a fallback for a bare failure', () => {
    expect(refundErrorMessage({ status: 400, error: { message: 'That refund is more than the payment still has.' } })).toBe(
      'That refund is more than the payment still has.',
    );
    expect(refundErrorMessage({ status: 500, error: null })).toBe('Could not refund the payment.');
  });

  it('counts a bill-paid month as having money left, so the dialog can say why it is not refundable', () => {
    const pass = {
      payments: [
        { id: 'cash', amount: '1500.00', refundedAmount: '0.00', billId: null },
        { id: 'through-bill', amount: '1500.00', refundedAmount: '0.00', billId: 'bill-9' },
      ],
    } as unknown as Pick<ParkingPass, 'payments'>;
    expect(paymentsWithRemainder(pass).map((payment) => payment.id)).toEqual(['cash', 'through-bill']);
    expect(refundablePayments(pass).map((payment) => payment.id)).toEqual(['cash']);
  });
});
