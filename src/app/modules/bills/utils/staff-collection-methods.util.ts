import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '../../../core/models/enums';
import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';

/**
 * Enabled destinations that apply to this property — property rows win over
 * the organization fallback, matching GET /portal/bills/:id/destinations.
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

/** Methods staff can record. Walk-in cash only when nothing is configured. */
export function staffCollectionMethods(
  destinations: PaymentDestinationResponse[],
  propertyId: string | null | undefined,
): PaymentMethod[] {
  const methods = [
    ...new Set(effectiveDestinationsForProperty(destinations, propertyId).map((row) => row.method)),
  ];
  return methods.length > 0 ? methods : ['CASH'];
}

export function staffCollectionMethodOptions(
  destinations: PaymentDestinationResponse[],
  propertyId: string | null | undefined,
): { value: PaymentMethod; label: string }[] {
  return staffCollectionMethods(destinations, propertyId).map((value) => ({
    value,
    label: PAYMENT_METHOD_LABELS[value],
  }));
}

export function staffCollectionMethodHint(
  destinations: PaymentDestinationResponse[],
  propertyId: string | null | undefined,
): string | null {
  if (effectiveDestinationsForProperty(destinations, propertyId).length > 0) return null;
  return 'No payment destinations yet. Cash is for walk-in collection. Add GCash or bank under Settings → Payment destinations.';
}
