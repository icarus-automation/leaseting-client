import type { PaymentDestinationType } from './enums';

/**
 * An online account residents pay into. Bank and e-wallet destinations carry an
 * account name and number; crypto carries a network and wallet address. The other
 * pair is null.
 */
export interface PaymentDestinationResponse {
  id: string;
  displayName: string;
  type: PaymentDestinationType;
  providerName: string;
  accountName: string | null;
  accountNumber: string | null;
  network: string | null;
  walletAddress: string | null;
  instructions: string | null;
  isEnabled: boolean;
  displayOrder: number;
  propertyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDestinationPayload {
  displayName: string;
  type: PaymentDestinationType;
  providerName: string;
  accountName?: string;
  accountNumber?: string;
  network?: string;
  walletAddress?: string;
  instructions?: string;
  propertyId?: string | null;
  displayOrder?: number;
  isEnabled?: boolean;
}

/** The destination an online payment went to, as payment history shows it. */
export interface PaymentDestinationSummary {
  id: string;
  displayName: string;
  type: PaymentDestinationType;
  providerName: string;
}
