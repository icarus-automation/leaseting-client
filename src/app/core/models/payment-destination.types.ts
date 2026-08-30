import type { PaymentMethod } from './enums';

export interface PaymentDestinationResponse {
  id: string;
  displayName: string;
  method: PaymentMethod;
  accountName: string;
  accountNumber: string;
  instructions: string | null;
  isEnabled: boolean;
  displayOrder: number;
  propertyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDestinationPayload {
  displayName: string;
  method: PaymentMethod;
  accountName: string;
  accountNumber: string;
  instructions?: string;
  propertyId?: string | null;
  displayOrder?: number;
  isEnabled?: boolean;
}
