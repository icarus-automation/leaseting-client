import type { ParkingAttendantResponse } from '../../../core/models/parking-attendant.types';
import { parkingAttendantBadge, sortAttendants } from './parking-attendant.util';

describe('parkingAttendantBadge', () => {
  it('marks a disabled login as destructive so it reads as revoked', () => {
    expect(parkingAttendantBadge('DISABLED')).toEqual({ label: 'Disabled', tone: 'destructive' });
  });

  it('marks an active login as success', () => {
    expect(parkingAttendantBadge('ACTIVE')).toEqual({ label: 'Active', tone: 'success' });
  });
});

describe('sortAttendants', () => {
  const attendant = (
    name: string,
    status: ParkingAttendantResponse['status'],
  ): ParkingAttendantResponse => ({
    id: name,
    name,
    email: `${name}@leaseting.com`,
    status,
    createdAt: '2026-01-01T00:00:00.000Z',
  });

  it('puts active logins first, then sorts by name', () => {
    const sorted = sortAttendants([
      attendant('Zoe', 'ACTIVE'),
      attendant('Ana', 'DISABLED'),
      attendant('Ben', 'ACTIVE'),
    ]);

    expect(sorted.map((row) => row.name)).toEqual(['Ben', 'Zoe', 'Ana']);
  });

  it('leaves the input array untouched', () => {
    const input = [attendant('Zoe', 'ACTIVE'), attendant('Ana', 'ACTIVE')];

    sortAttendants(input);

    expect(input.map((row) => row.name)).toEqual(['Zoe', 'Ana']);
  });
});
