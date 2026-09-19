
export type ParkingSessionStatus = 'OPEN' | 'PAID' | 'VOID';
export type ParkingShiftStatus = 'OPEN' | 'DECLARED' | 'CONFIRMED';

export type ParkingOverviewView = 'IN_PARK' | 'ACTIVITY';

export interface ParkingOverviewSession {
  id: string;
  ticketCode: string;
  plateNumber: string;
  status: ParkingSessionStatus;
  entryAt: string;
  exitAt: string | null;
  terminalId: string;
  terminalName: string;
  propertyId: string;
  propertyName: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  ratePlanName: string | null;
  billedMinutes: number | null;
  feeAmount: string | null;
  amountTendered: string | null;
  changeGiven: string | null;
  entryAttendantId: string;
  entryAttendantName: string;
  exitAttendantId: string | null;
  exitAttendantName: string | null;
  voidedAt: string | null;
  voidedReason: string | null;
  voidedById: string | null;
  voidedByName: string | null;
}

export interface ParkingOverviewShift {
  id: string;
  status: ParkingShiftStatus;
  openedAt: string;
  declaredAt: string | null;
  confirmedAt: string | null;
  expectedCash: string;
  declaredCash: string | null;
  variance: string | null;
  note: string | null;
  terminalId: string;
  terminalName: string;
  propertyId: string;
  propertyName: string;
  attendantId: string;
  attendantName: string;
  confirmedById: string | null;
  confirmedByName: string | null;
}

export interface ParkingOverviewSummary {
  inParkCount: number;
  openShiftCount: number;
  shiftsPendingConfirm: number;
  paidExitsToday: number;
  voidsToday: number;
  collectedToday: string;
}

export interface ParkingOverviewScope {
  propertyId?: string;
  terminalId?: string;
}

export interface ParkingOverviewSessionQuery extends ParkingOverviewScope {
  view?: ParkingOverviewView;
  plate?: string;
  limit?: number;
}

export interface ParkingOverviewShiftQuery extends ParkingOverviewScope {
  status?: ParkingShiftStatus;
  limit?: number;
}
