import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';
import {
  staffCollectionMethodHint,
  staffCollectionMethods,
} from './staff-collection-methods.util';

const destination = (
  overrides: Partial<PaymentDestinationResponse>,
): PaymentDestinationResponse => ({
  id: 'd1',
  displayName: 'GCash',
  method: 'GCASH',
  accountName: 'Ada',
  accountNumber: '0917',
  instructions: null,
  isEnabled: true,
  displayOrder: 0,
  propertyId: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('staffCollectionMethods', () => {
  it('falls back to cash when nothing is configured', () => {
    expect(staffCollectionMethods([], 'prop-1')).toEqual(['CASH']);
    expect(staffCollectionMethodHint([], 'prop-1')).toMatch(/walk-in/i);
  });

  it('shows only GCash when that is the only enabled destination', () => {
    expect(staffCollectionMethods([destination({})], 'prop-1')).toEqual(['GCASH']);
    expect(staffCollectionMethodHint([destination({})], 'prop-1')).toBeNull();
  });

  it('ignores disabled destinations', () => {
    expect(staffCollectionMethods([destination({ isEnabled: false })], 'prop-1')).toEqual(['CASH']);
  });

  it('prefers property destinations over the organization fallback', () => {
    expect(
      staffCollectionMethods(
        [
          destination({ id: 'org', method: 'GCASH', propertyId: null }),
          destination({ id: 'prop', method: 'BANK_TRANSFER', propertyId: 'prop-1' }),
        ],
        'prop-1',
      ),
    ).toEqual(['BANK_TRANSFER']);
  });
});
