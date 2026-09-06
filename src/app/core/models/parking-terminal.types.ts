export interface ParkingTerminalResponse {
  id: string;
  name: string;
  isActive: boolean;
  propertyId: string;
  propertyName: string;
  propertyIsArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateParkingTerminalPayload {
  name: string;
  propertyId: string;
  isActive?: boolean;
}

export type UpdateParkingTerminalPayload = Partial<CreateParkingTerminalPayload>;
