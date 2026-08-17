/**
 * Org-curated property types (replaces the old hardcoded enum). Archived
 * types stay attached to existing properties but are hidden from pickers.
 */
export interface PropertyTypeResponse {
  id: string;
  name: string;
  isArchived: boolean;
  /** Live (unarchived) properties currently using this type. */
  propertyCount: number;
  createdAt: string;
  updatedAt: string;
}
