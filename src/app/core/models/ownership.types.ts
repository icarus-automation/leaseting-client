export interface OwnershipResident {
  id: string;
  firstName: string;
  lastName: string;
}

export interface OwnershipResponse {
  id: string;
  unitId: string;
  residentId: string;
  startDate: string;
  endDate: string | null;
  price: string | null;
  note: string | null;
  billsElectricity: boolean;
  billsWater: boolean;
  resident: OwnershipResident;
  createdAt: string;
  updatedAt: string;
}

export interface ResaleWarning {
  residentId: string;
  unpaidBillCount: number;
  outstandingBalance: string;
}

export interface ResaleResult {
  ownership: OwnershipResponse;
  closedOwnershipId: string;
  warning: ResaleWarning | null;
}

export interface SellUnitPayload {
  residentId: string;
  startDate: string;
  price?: number;
  note?: string;
  billsElectricity?: boolean;
  billsWater?: boolean;
}

export interface ResellUnitPayload {
  residentId: string;
  transferDate: string;
  price?: number;
  note?: string;
  billsElectricity?: boolean;
  billsWater?: boolean;
}
