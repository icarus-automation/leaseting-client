import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';

export interface DestinationGroup {
  propertyId: string | null;
  destinations: PaymentDestinationResponse[];
}

export function groupDestinationsByScope(
  destinations: PaymentDestinationResponse[],
): DestinationGroup[] {
  const org = destinations.filter((destination) => destination.propertyId === null);
  const propertyIds = [
    ...new Set(
      destinations
        .map((destination) => destination.propertyId)
        .filter((id): id is string => id !== null),
    ),
  ];
  return [
    ...(org.length > 0 ? [{ propertyId: null, destinations: org }] : []),
    ...propertyIds.map((propertyId) => ({
      propertyId,
      destinations: destinations.filter((destination) => destination.propertyId === propertyId),
    })),
  ];
}
