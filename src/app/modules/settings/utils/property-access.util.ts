import type { ValidatorFn } from '@angular/forms';

import type { PropertyAccess } from '../../../core/models/property-access.types';

/**
 * Property limits on the Users page (leaseting-api docs/fe-access-api.md,
 * "Property limits"). The API enforces them; these helpers only decide what
 * to show and what a form sends.
 */

/** What the property access picker holds: every property, or the picked ones. */
export interface PropertyAccessValue {
  everyProperty: boolean;
  propertyIds: string[];
}

export const EVERY_PROPERTY_VALUE: PropertyAccessValue = { everyProperty: true, propertyIds: [] };

/** The body's `propertyIds`: `[]` for every property. */
export function toPropertyIds(value: PropertyAccessValue): string[] {
  return value.everyProperty ? [] : [...value.propertyIds];
}

/**
 * The picker's starting value for someone's current limits. Archived
 * properties can't be given again, so they drop out of the selection.
 */
export function pickerValueOf(access: PropertyAccess): PropertyAccessValue {
  if (!access.isLimited) return EVERY_PROPERTY_VALUE;
  const archived = new Set(access.properties.filter((property) => property.isArchived).map((property) => property.id));
  return { everyProperty: false, propertyIds: access.propertyIds.filter((id) => !archived.has(id)) };
}

/** "Specific properties" needs at least one. */
export const propertyAccessValidator: ValidatorFn = (control) => {
  const value = control.value as PropertyAccessValue | null;
  return value && !value.everyProperty && value.propertyIds.length === 0 ? { propertiesRequired: true } : null;
};

export interface PropertyAccessSummary {
  /** "All properties", "1 property", "3 properties". */
  label: string;
  /** The names, comma-separated, for the tooltip. Null when not limited. */
  names: string | null;
}

export function propertyAccessSummary(access: PropertyAccess): PropertyAccessSummary {
  if (!access.isLimited) return { label: 'All properties', names: null };

  const count = access.propertyIds.length;
  const named = access.properties.map((property) => (property.isArchived ? `${property.name} (archived)` : property.name));
  // `properties` leaves out the ones outside the viewer's own limits.
  const hidden = count - access.properties.length;
  const names = hidden > 0 ? [...named, `${hidden} more you can't see`] : named;
  return { label: `${count} ${count === 1 ? 'property' : 'properties'}`, names: names.join(', ') };
}

/**
 * True when `actor` reaches every one of `propertyIds`. An empty list means
 * every property, which only someone with every property covers. Mirrors the
 * API: nobody gives, or replaces, access they don't have themselves.
 */
export function coversProperties(actor: PropertyAccess, propertyIds: readonly string[]): boolean {
  if (!actor.isLimited) return true;
  return propertyIds.length > 0 && propertyIds.every((id) => actor.propertyIds.includes(id));
}
