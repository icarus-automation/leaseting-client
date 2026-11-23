import type { PaymentMethod } from './enums';

/**
 * How staff received money, as the API takes it: only the fields that belong to the
 * method. Online names the destination; Check may carry its number, bank, and date.
 */
export interface PaymentMethodPayload {
  method: PaymentMethod;
  destinationId?: string;
  checkNumber?: string;
  checkBank?: string;
  /** yyyy-MM-dd */
  checkDate?: string;
}
