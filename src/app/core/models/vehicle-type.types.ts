/**
 * Org-curated vehicle categories accepted at the property. Archived types stay
 * on existing rate amounts but are hidden from pickers.
 */
export interface VehicleTypeResponse {
  id: string;
  name: string;
  isArchived: boolean;
  /** Rate plans that currently price this type. */
  ratePlanCount: number;
  createdAt: string;
  updatedAt: string;
}
