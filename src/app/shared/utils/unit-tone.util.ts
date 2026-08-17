import type { UnitStatus } from '../../core/models/enums';

/** Occupancy tone shared by badges, floor-plan fills, and the map editor. */
export type UnitTone = 'success' | 'destructive' | 'vacant';

export interface UnitStatusLike {
  status: UnitStatus;
  hasOverdueBills: boolean;
}

/** Single source of the status → tone rule (was duplicated across viewer/editor). */
export function unitTone(unit: UnitStatusLike): UnitTone {
  if (unit.status === 'VACANT') return 'vacant';
  return unit.hasOverdueBills ? 'destructive' : 'success';
}

export function unitToneLabel(unit: UnitStatusLike): 'Settled' | 'Overdue' | 'Vacant' {
  switch (unitTone(unit)) {
    case 'vacant':
      return 'Vacant';
    case 'destructive':
      return 'Overdue';
    default:
      return 'Settled';
  }
}
