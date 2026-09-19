export type ParkingAttendantStatus = 'ACTIVE' | 'DISABLED';

export interface ParkingAttendantResponse {
  id: string;
  name: string;
  email: string;
  status: ParkingAttendantStatus;
  createdAt: string;
}
