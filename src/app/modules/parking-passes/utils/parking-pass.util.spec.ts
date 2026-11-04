import { formatPassDay, passPaymentOptions, passStatus, paymentRemainingCents } from './parking-pass.util';
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
