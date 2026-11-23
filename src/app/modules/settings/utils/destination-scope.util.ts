import type { PaymentDestinationResponse } from '../../../core/models/payment-destination.types';

export const ORGANIZATION_FALLBACK_LABEL = 'Organization fallback';

export interface DestinationGroup {
  propertyId: string | null;
  label: string;
  destinations: PaymentDestinationResponse[];
}

function byDisplayOrder(a: PaymentDestinationResponse, b: PaymentDestinationResponse): number {
  return a.displayOrder - b.displayOrder || a.displayName.localeCompare(b.displayName);
}

/**
 * One group per property, by property name, with the organization fallback last. Each
 * group lists its destinations in the order residents see them.
 */
export function groupDestinationsByScope(
  destinations: PaymentDestinationResponse[],
  propertyName: (propertyId: string) => string,
): DestinationGroup[] {
  const propertyIds = [
    ...new Set(destinations.map((destination) => destination.propertyId).filter((id): id is string => id !== null)),
  ];
  const propertyGroups = propertyIds
    .map((propertyId) => ({
      propertyId,
      label: propertyName(propertyId),
      destinations: destinations.filter((destination) => destination.propertyId === propertyId).sort(byDisplayOrder),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const fallback = destinations.filter((destination) => destination.propertyId === null).sort(byDisplayOrder);
  return [
    ...propertyGroups,
    ...(fallback.length > 0 ? [{ propertyId: null, label: ORGANIZATION_FALLBACK_LABEL, destinations: fallback }] : []),
  ];
}

/**
 * The display orders after moving one destination up or down within its group. Every
 * sibling is renumbered, so destinations that share an order still move.
 */
export function reorderedSiblings(
  siblings: PaymentDestinationResponse[],
  id: string,
  direction: -1 | 1,
): { id: string; displayOrder: number }[] | null {
  const index = siblings.findIndex((destination) => destination.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= siblings.length) return null;
  const order = [...siblings];
  [order[index], order[target]] = [order[target], order[index]];
  return order.map((destination, displayOrder) => ({ id: destination.id, displayOrder }));
}

/** Where a new destination goes: after the ones already in its group. */
export function nextDisplayOrder(destinations: PaymentDestinationResponse[], propertyId: string | null): number {
  const siblings = destinations.filter((destination) => destination.propertyId === propertyId);
  return siblings.reduce((highest, destination) => Math.max(highest, destination.displayOrder + 1), 0);
}
