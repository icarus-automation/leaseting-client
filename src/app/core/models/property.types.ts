import type { ChargeLine } from './charge-item.types';
import type { UnitStatus } from './enums';
import type { BillType } from './enums';

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

export interface CreateUnitPayload {
  unitNo: string;
  monthlyRent?: number;
  mapCoordinates?: MapCoordinates;
  notes?: string;
}

export type UpdateUnitPayload = Partial<Omit<CreateUnitPayload, 'mapCoordinates'>> & {
  mapCoordinates?: MapCoordinates | null;
};

export interface UnitPickerItem {
  id: string;
  unitNo: string;
  monthlyRent: string | null;
  status: UnitStatus;
  floor: { id: string; level: number };
  property: { id: string; name: string };
}
