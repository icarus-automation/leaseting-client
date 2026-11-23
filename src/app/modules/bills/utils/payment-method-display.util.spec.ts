import type { PaymentResponse } from '../../../core/models/bill.types';
import { paymentMethodSummary, withPaymentDefaults } from './payment-method-display.util';

describe('paymentMethodSummary', () => {
  const none = { destination: null, checkBank: null, checkNumber: null };

  it('names the destination of an online payment', () => {
    expect(
      paymentMethodSummary({
        ...none,
        method: 'ONLINE',
        destination: { id: 'd', displayName: 'BDO Savings', type: 'BANK_TRANSFER', providerName: 'BDO' },
      }),
    ).toBe('Online · BDO Savings');
  });

  it('shows the bank and number of a check', () => {
    expect(paymentMethodSummary({ ...none, method: 'CHECK', checkBank: 'BPI', checkNumber: '004512' })).toBe(
      'Check · BPI · No. 004512',
    );
  });

  it('reads cash, an online payment from before destinations, and an old method', () => {
    expect(paymentMethodSummary({ ...none, method: 'CASH' })).toBe('Cash');
    expect(paymentMethodSummary({ ...none, method: 'ONLINE' })).toBe('Online');
    expect(paymentMethodSummary({ ...none, method: 'GCASH' })).toBe('GCash');
  });
});

describe('withPaymentDefaults', () => {
  it('fills what an API from before destinations leaves out', () => {
    const older = { id: 'pay-1', method: 'GCASH', amount: '100.00' } as unknown as PaymentResponse;

    expect(withPaymentDefaults(older)).toMatchObject({
      destinationId: null,
      destination: null,
      checkNumber: null,
      checkBank: null,
      checkDate: null,
    });
  });
});
