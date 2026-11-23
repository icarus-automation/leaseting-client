import { PAYMENT_DESTINATION_TYPE_LABELS, type PaymentDestinationType } from '../../core/models/enums';
import type { PaymentDestinationResponse } from '../../core/models/payment-destination.types';

const MASK = '••••';
const VISIBLE_TAIL = 4;
const WALLET_HEAD = 6;

/**
 * The enabled destinations a property offers: its own when it has any, otherwise the
 * organization fallback. The API applies the same rule when it checks a payment.
 */
export function effectiveDestinationsForProperty(
  destinations: PaymentDestinationResponse[],
  propertyId: string | null | undefined,
): PaymentDestinationResponse[] {
  const enabled = destinations.filter((destination) => destination.isEnabled);
  if (propertyId) {
    const propertyRows = enabled.filter((destination) => destination.propertyId === propertyId);
    if (propertyRows.length > 0) return propertyRows;
  }
  return enabled.filter((destination) => destination.propertyId === null);
}

/** "•••• 7907" for an account number, keeping only the last four characters. */
export function maskAccountNumber(value: string | null | undefined): string {
  const compact = (value ?? '').replace(/\s+/g, '');
  if (compact.length <= VISIBLE_TAIL) return compact;
  return `${MASK} ${compact.slice(-VISIBLE_TAIL)}`;
}

/** "TQ5n8L…ZoKt" for a wallet address: enough of both ends to recognise it. */
export function maskWalletAddress(value: string | null | undefined): string {
  const address = (value ?? '').trim();
  if (address.length <= WALLET_HEAD + VISIBLE_TAIL) return address;
  return `${address.slice(0, WALLET_HEAD)}…${address.slice(-VISIBLE_TAIL)}`;
}

/** The masked account number, or the masked wallet address for crypto. */
export function destinationMaskedNumber(destination: PaymentDestinationResponse): string {
  return destination.type === 'CRYPTO'
    ? maskWalletAddress(destination.walletAddress)
    : maskAccountNumber(destination.accountNumber);
}

/** "E-wallet · Maya" */
export function destinationKindLabel(destination: Pick<PaymentDestinationResponse, 'type' | 'providerName'>): string {
  return `${PAYMENT_DESTINATION_TYPE_LABELS[destination.type] ?? destination.type} · ${destination.providerName}`;
}

/** Who or what the money goes to: the account name, or the network for crypto. */
export function destinationHolder(destination: PaymentDestinationResponse): string {
  return (destination.type === 'CRYPTO' ? destination.network : destination.accountName) ?? '';
}

/** "Ace Gabriel Pasiliao · •••• 7907", or "TRC20 · TQ5n8L…ZoKt" for crypto. */
export function destinationAccountLine(destination: PaymentDestinationResponse): string {
  return [destinationHolder(destination), destinationMaskedNumber(destination)].filter(Boolean).join(' · ');
}

/** "E-wallet · Maya · •••• 7907": what a destination picker shows under the name. */
export function destinationPickerDetail(destination: PaymentDestinationResponse): string {
  return [destinationKindLabel(destination), destinationMaskedNumber(destination)].filter(Boolean).join(' · ');
}

/** The shape an API from before destination types returns, which the client may still meet. */
interface LegacyDestinationFields {
  method?: string;
}

const LEGACY_TYPES: Record<string, PaymentDestinationType> = {
  GCASH: 'E_WALLET',
  OTHER: 'E_WALLET',
};

/**
 * Fills the destination-type fields an API that is not deployed yet leaves out. The
 * client deploys before the API, so for a while lists can arrive in the old shape.
 */
export function withDestinationDefaults(
  raw: PaymentDestinationResponse & LegacyDestinationFields,
): PaymentDestinationResponse {
  const { method, ...destination } = raw;
  return {
    ...destination,
    type: destination.type ?? LEGACY_TYPES[method ?? ''] ?? 'BANK_TRANSFER',
    providerName: destination.providerName ?? (method === 'GCASH' ? 'GCash' : destination.displayName),
    accountName: destination.accountName ?? null,
    accountNumber: destination.accountNumber ?? null,
    network: destination.network ?? null,
    walletAddress: destination.walletAddress ?? null,
  };
}
