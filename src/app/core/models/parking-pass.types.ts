export interface ParkingPassPrice {
  vehicleTypeId: string;
  vehicleTypeName: string;
  amount: string;
}

export interface ParkingPassPrices {
  propertyId: string;
  graceDays: number;
  prices: ParkingPassPrice[];
}

export interface ReplaceParkingPassPrices {
  graceDays: number;
  prices: { vehicleTypeId: string; amount: number }[];
}

export interface ParkingPassRefund {
  id: string;
  amount: string;
  reason: string;
  refundedById: string;
  createdAt: string;
}

export interface ParkingPassPayment {
  id: string;
  amount: string;
  periodStart: string;
  periodEnd: string;
  method: string;
  destinationId: string | null;
  destinationName: string | null;
  takenById: string;
  shiftId: string | null;
  refundedAmount: string;
  refunds: ParkingPassRefund[];
  createdAt: string;
}

export interface ParkingPass {
  id: string;
  plateDisplay: string;
  plateKey: string;
  holderName: string;
  holderContact: string | null;
  propertyId: string;
  propertyName: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  leaseId: string | null;
  ownershipId: string | null;
  paidUntil: string;
  graceDays: number;
  valid: boolean;
  endedAt: string | null;
  endReason: string | null;
  payments: ParkingPassPayment[];
}

export interface SellParkingPassPayload {
  propertyId: string;
  vehicleTypeId: string;
  plate: string;
  holderName?: string;
  holderContact?: string;
  leaseId?: string;
  destinationId?: string;
}

export interface RenewParkingPassPayload {
  destinationId?: string;
}
