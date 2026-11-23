import type { PaymentDestinationResponse } from '../../core/models/payment-destination.types';

/** An enabled organization-wide e-wallet destination, for specs. */
export function destinationFixture(overrides: Partial<PaymentDestinationResponse> = {}): PaymentDestinationResponse {
  return {
    id: 'dest-1',
    displayName: 'Brickstone Maya',
    type: 'E_WALLET',
    providerName: 'Maya',
    accountName: 'Ace Gabriel Pasiliao',
    accountNumber: '09917897907',
    network: null,
    walletAddress: null,
    instructions: null,
    isEnabled: true,
    displayOrder: 0,
    propertyId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** A crypto destination on TRC20, for specs. */
export function cryptoDestinationFixture(overrides: Partial<PaymentDestinationResponse> = {}): PaymentDestinationResponse {
  return destinationFixture({
    id: 'dest-usdt',
    displayName: 'USDT (TRC20)',
    type: 'CRYPTO',
    providerName: 'USDT',
    accountName: null,
    accountNumber: null,
    network: 'TRC20',
    walletAddress: 'TQ5n8Lxk2VbP7sWm3hRfYd9cJ1aE6uZoKt',
    ...overrides,
  });
}
