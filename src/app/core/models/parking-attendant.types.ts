import type { PropertyAccess } from './property-access.types';

export type ParkingAttendantStatus = 'ACTIVE' | 'DISABLED';

export interface ParkingAttendantResponse {
  /** The attendant's user id. */
  id: string;
  name: string;
  email: string;
  status: ParkingAttendantStatus;
  createdAt: string;
  /** The properties whose terminals they work. */
  propertyAccess: PropertyAccess;
}

export interface CreateParkingAttendantPayload {
  name: string;
  email: string;
  password: string;
  /** The properties they are limited to; leave out for every property. */
  propertyIds?: string[];
}
