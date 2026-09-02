export type ParkingAttendantStatus = 'ACTIVE' | 'DISABLED';

/** A terminal login: a user carrying the `parking_attendant` organization role. */
export interface ParkingAttendantResponse {
  id: string;
  name: string;
  email: string;
  status: ParkingAttendantStatus;
  createdAt: string;
}
