import type { PaymentDestinationResponse } from '../../core/models/payment-destination.types';
import { cryptoDestinationFixture, destinationFixture } from './payment-destination.fixture';
import {
  destinationAccountLine,
  destinationKindLabel,
  destinationPickerDetail,
  effectiveDestinationsForProperty,
  maskAccountNumber,
  maskWalletAddress,
  withDestinationDefaults,
} from './payment-destination.util';

const usdt = cryptoDestinationFixture();

describe('payment destination display', () => {
  it('keeps only the last four characters of an account number', () => {
    expect(maskAccountNumber('0034 5678 9012')).toBe('•••• 9012');
    expect(maskAccountNumber('1234')).toBe('1234');
    expect(maskAccountNumber(null)).toBe('');
  });

  it('keeps both ends of a wallet address', () => {
    expect(maskWalletAddress('TQ5n8Lxk2VbP7sWm3hRfYd9cJ1aE6uZoKt')).toBe('TQ5n8L…ZoKt');
    expect(maskWalletAddress('0xabc123')).toBe('0xabc123');
  });

  it('names the type and provider', () => {
    expect(destinationKindLabel(destinationFixture())).toBe('E-wallet · Maya');
    expect(destinationKindLabel(usdt)).toBe('Crypto · USDT');
  });

  it('shows the account name and masked number, or the network and masked wallet', () => {
    expect(destinationAccountLine(destinationFixture())).toBe('Ace Gabriel Pasiliao · •••• 7907');
    expect(destinationAccountLine(usdt)).toBe('TRC20 · TQ5n8L…ZoKt');
  });

  it('gives a picker its type, provider, and masked number', () => {
    expect(destinationPickerDetail(destinationFixture())).toBe('E-wallet · Maya · •••• 7907');
    expect(destinationPickerDetail(usdt)).toBe('Crypto · USDT · TQ5n8L…ZoKt');
  });
});

describe('effectiveDestinationsForProperty', () => {
  it("prefers the property's enabled destinations over the organization fallback", () => {
    const rows = [
      destinationFixture({ id: 'org' }),
      destinationFixture({ id: 'prop', propertyId: 'prop-1' }),
      destinationFixture({ id: 'off', propertyId: 'prop-1', isEnabled: false }),
    ];
    expect(effectiveDestinationsForProperty(rows, 'prop-1').map((row) => row.id)).toEqual(['prop']);
    expect(effectiveDestinationsForProperty(rows, 'prop-2').map((row) => row.id)).toEqual(['org']);
  });

  it('offers nothing when every destination is disabled', () => {
    expect(effectiveDestinationsForProperty([destinationFixture({ isEnabled: false })], 'prop-1')).toEqual([]);
  });
});

describe('withDestinationDefaults', () => {
  it('reads a destination from an API that still sends the old method', () => {
    const older = {
      id: 'dest-1',
      displayName: 'GCash Main',
      method: 'GCASH',
      accountName: 'Ana',
      accountNumber: '0917',
      instructions: null,
      isEnabled: true,
      displayOrder: 0,
      propertyId: null,
      createdAt: '',
      updatedAt: '',
    } as unknown as PaymentDestinationResponse;

    const destination = withDestinationDefaults(older);

    expect(destination).toMatchObject({ type: 'E_WALLET', providerName: 'GCash', network: null, walletAddress: null });
    expect(destination).not.toHaveProperty('method');
  });

  it('treats an old bank transfer as a bank named after the destination', () => {
    const older = { ...destinationFixture({ displayName: 'BDO Savings' }), type: undefined, providerName: undefined, method: 'BANK_TRANSFER' };
    expect(withDestinationDefaults(older as unknown as PaymentDestinationResponse)).toMatchObject({
      type: 'BANK_TRANSFER',
      providerName: 'BDO Savings',
    });
  });

  it('leaves a current destination as it is', () => {
    expect(withDestinationDefaults(usdt)).toEqual(usdt);
  });
});
