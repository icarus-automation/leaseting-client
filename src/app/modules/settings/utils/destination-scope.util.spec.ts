import { groupDestinationsByScope } from './destination-scope.util';
import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';

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

describe('groupDestinationsByScope', () => {
  it('keeps organization fallback ahead of property destinations', () => {
    const groups = groupDestinationsByScope([
      destination({ id: 'p', propertyId: 'prop-1' }),
      destination({ id: 'o', propertyId: null }),
    ]);
    expect(groups[0]?.propertyId).toBeNull();
    expect(groups[1]?.propertyId).toBe('prop-1');
  });

  it('omits an empty organization group', () => {
    const groups = groupDestinationsByScope([destination({ propertyId: 'prop-1' })]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.propertyId).toBe('prop-1');
  });
});
