import {
  canBillByHand,
  formatPassDay,
  passPaymentOptions,
  passStatus,
  paymentRemainingCents,
  refundablePayments,
  reviewReasonLabel,
  waitingBill,
} from './parking-pass.util';
import type { ParkingPassBill, ParkingPassPayment } from '../../../core/models/parking-pass.types';
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
