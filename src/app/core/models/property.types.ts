import type { ChargeLine } from './charge-item.types';
import type { UnitStatus } from './enums';
import type { BillType } from './enums';

/**
 * Money fields (`monthlyRent`, `amount`) are Prisma Decimals and serialize as
 * strings — parse only for display (see PhpCurrencyPipe), never for storage.
 * Dates are ISO strings.
 */

export interface UnitSummary {
  total: number;
  settled: number;
  overdue: number;
  vacant: number;
}

/** The property's org-curated type (may be archived — still displayed). */
export interface PropertyTypeRef {
  id: string;
  name: string;
}

export interface PropertyResponse {
  id: string;
  name: string;
  type: PropertyTypeRef;
  addressLine: string;
  city: string;
  /** Absolute R2 URL, or null when no image was uploaded. */
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyListItem extends PropertyResponse {
  unitSummary: UnitSummary;
}

export interface PropertyFloorItem {
  id: string;
  level: number;
  name: string | null;
  planImageUrl: string | null;
}

export interface PropertyDetail extends PropertyResponse {
  /** Ordered by level ascending. */
  floors: PropertyFloorItem[];
}

export interface CreatePropertyPayload {
  name: string;
  propertyTypeId: string;
  addressLine: string;
  city: string;
}

export interface FloorResponse {
  id: string;
  level: number;
  name: string | null;
  planImageUrl: string | null;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
}

/** Normalized polygon: each point is [x, y] in 0–1 image space, ≥3 points. */
export interface MapCoordinates {
  points: [number, number][];
}

export interface FloorUnitItem {
  id: string;
  unitNo: string;
  monthlyRent: string | null;
  mapCoordinates: MapCoordinates | null;
  notes: string | null;
  status: UnitStatus;
  hasOverdueBills: boolean;
  activeLease: { id: string; tenantName: string } | null;
}

export interface FloorDetail extends FloorResponse {
  /** Ordered by unitNo ascending. */
  units: FloorUnitItem[];
  summary: UnitSummary;
}

export interface CreateFloorPayload {
  level: number;
  name?: string;
}

export interface UnitResponse {
  id: string;
  unitNo: string;
  monthlyRent: string | null;
  mapCoordinates: MapCoordinates | null;
  notes: string | null;
  floorId: string;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitOutstandingBill {
  id: string;
  type: BillType;
  amount: string;
  dueDate: string;
}

export interface UnitActiveLease {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  /**
   * The lines that make up `monthlyRent`, snapshotted at onboarding. null for
   * leases written before charges were itemised, or entered by hand.
   */
  rentCharges: ChargeLine[] | null;
  dueDay: number;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    contactNo: string;
  };
  /** UNPAID bills, ordered by dueDate ascending. */
  outstandingBills: UnitOutstandingBill[];
}

export interface UnitDetail extends UnitResponse {
  status: UnitStatus;
  hasOverdueBills: boolean;
  activeLease: UnitActiveLease | null;
}

export interface CreateUnitPayload {
  unitNo: string;
  monthlyRent?: number;
  mapCoordinates?: MapCoordinates;
  notes?: string;
}

/** `mapCoordinates: null` clears the shape (unmaps the unit from the plan). */
export type UpdateUnitPayload = Partial<Omit<CreateUnitPayload, 'mapCoordinates'>> & {
  mapCoordinates?: MapCoordinates | null;
};

/** Lightweight row for cross-property unit pickers (onboarding wizard). */
export interface UnitPickerItem {
  id: string;
  unitNo: string;
  monthlyRent: string | null;
  status: UnitStatus;
  floor: { id: string; level: number };
  property: { id: string; name: string };
}
