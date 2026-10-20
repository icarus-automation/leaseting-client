import type { ChargeLine } from './charge-item.types';
import type { BillType, PricingBasis, UnitStatus } from './enums';
import type { LeaseRentSnapshot } from './lease.types';

export interface UnitSummary {
  total: number;
  settled: number;
  overdue: number;
  vacant: number;
}

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
  imageUrl: string | null;
  defaultRatePerSqm: number | null;
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
  planThumbUrl: string | null;
}

export interface PropertyDetail extends PropertyResponse {
  floors: PropertyFloorItem[];
}

export interface CreatePropertyPayload {
  name: string;
  propertyTypeId: string;
  addressLine: string;
  city: string;
  defaultRatePerSqm?: number | null;
}

export interface FloorResponse {
  id: string;
  level: number;
  name: string | null;
  planImageUrl: string | null;
  planThumbUrl: string | null;
  propertyId: string;
  createdAt: string;
  updatedAt: string;
}

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
  units: FloorUnitItem[];
  summary: UnitSummary;
}

export interface CreateFloorPayload {
  level: number;
  name?: string;
}

export interface UnitQuote {
  pricingBasis: PricingBasis;
  monthlyRent: string | null;
  computedMonthlyRent: number | null;
}

export interface UnitPricingRead extends UnitQuote {
  floorAreaSqm: number | null;
  ratePerSqmOverride: number | null;
  effectiveRatePerSqm: number | null;
}

export interface UnitResponse extends UnitPricingRead {
  id: string;
  unitNo: string;
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

export interface UnitActiveLease extends LeaseRentSnapshot {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  rentCharges: ChargeLine[] | null;
  dueDay: number;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    contactNo: string;
  };
  outstandingBills: UnitOutstandingBill[];
}

export interface UnitDetail extends UnitResponse {
  status: UnitStatus;
  hasOverdueBills: boolean;
  activeLease: UnitActiveLease | null;
}

export type UnitFieldsWrite = {
  unitNo: string;
  notes?: string;
} & (
  | {
      pricingBasis: 'FIXED';
      monthlyRent?: number;
    }
  | {
      pricingBasis: 'PER_SQM';
      floorAreaSqm: number;
      ratePerSqmOverride: number | null;
    }
);

export interface UnitMapWrite {
  mapCoordinates: MapCoordinates | null;
}

export type CreateUnitPayload = UnitFieldsWrite;
export type UpdateUnitPayload = UnitFieldsWrite | UnitMapWrite;

interface UnitPickerBase {
  id: string;
  unitNo: string;
  status: UnitStatus;
  floor: { id: string; level: number };
  property: { id: string; name: string };
}

export type UnitPickerItem =
  | (UnitPickerBase & UnitQuote)
  | (UnitPickerBase & {
      pricingBasis: null;
      monthlyRent: null;
      computedMonthlyRent: null;
    });
