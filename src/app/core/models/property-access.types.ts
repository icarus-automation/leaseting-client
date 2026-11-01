/** A property as property limits name it. */
export interface PropertyRef {
  id: string;
  name: string;
  isArchived: boolean;
}

/**
 * Which properties someone works with (leaseting-api docs/fe-access-api.md,
 * "Property limits"). Empty limits mean every property; owners and residents are
 * never limited.
 */
export interface PropertyAccess {
  /** False: every property, including ones added later. */
  isLimited: boolean;
  /** Every property they are limited to; empty when not limited. */
  propertyIds: string[];
  /** The ones in `propertyIds` you can see yourself, with names, by name. Can be shorter. */
  properties: PropertyRef[];
}

export const EVERY_PROPERTY: PropertyAccess = { isLimited: false, propertyIds: [], properties: [] };
