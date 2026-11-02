import type { PropertyMode, UnitStatus } from '../../core/models/enums';
import type { UnitSummary } from '../../core/models/property.types';

export type UnitTone = 'success' | 'destructive' | 'vacant';

export interface UnitStatusLike {
  status: UnitStatus;
  hasOverdueBills: boolean;
}

export interface FloorSummaryBadge {
  tone: UnitTone;
  label: string;
  count: number;
}

export function unitTone(unit: UnitStatusLike): UnitTone {
  if (unit.status === 'SOLD') return unit.hasOverdueBills ? 'destructive' : 'success';
  if (unit.status === 'AVAILABLE' || unit.status === 'VACANT') return 'vacant';
  return unit.hasOverdueBills ? 'destructive' : 'success';
}

export function unitToneLabel(unit: UnitStatusLike): 'Sold' | 'Available' | 'Settled' | 'Overdue' | 'Vacant' {
  if (unit.status === 'SOLD') return unit.hasOverdueBills ? 'Overdue' : 'Sold';
  if (unit.status === 'AVAILABLE') return 'Available';
  switch (unitTone(unit)) {
    case 'vacant':
      return 'Vacant';
    case 'destructive':
      return 'Overdue';
    default:
      return 'Settled';
  }
}

export function floorSummaryBadges(mode: PropertyMode, summary: UnitSummary): FloorSummaryBadge[] {
  if (mode === 'CONDO') {
    return [
      { tone: 'success', label: 'Sold', count: summary.settled },
      { tone: 'destructive', label: 'Overdue', count: summary.overdue },
      { tone: 'vacant', label: 'Available', count: summary.vacant },
    ];
  }
  return [
    { tone: 'success', label: 'Settled', count: summary.settled },
    { tone: 'destructive', label: 'Overdue', count: summary.overdue },
    { tone: 'vacant', label: 'Vacant', count: summary.vacant },
  ];
}
