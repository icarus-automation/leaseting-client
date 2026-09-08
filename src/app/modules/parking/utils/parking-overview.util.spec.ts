import type {
  ParkingOverviewSession,
  ParkingOverviewShift,
} from '../../../core/models/parking-overview.types';
import {
  canConfirm,
  canVoid,
  elapsedLabel,
  elapsedMinutes,
  sessionBadge,
  shiftBadge,
  varianceLabel,
  varianceState,
} from './parking-overview.util';

const NOW = Date.parse('2026-09-07T12:00:00Z');

function session(overrides: Partial<ParkingOverviewSession> = {}): ParkingOverviewSession {
  return {
    id: 'sess-1',
    ticketCode: 'A3KD9MPQ',
    plateNumber: 'ABC 1234',
    status: 'OPEN',
    entryAt: '2026-09-07T09:00:00Z',
    exitAt: null,
    terminalId: 'term-1',
    terminalName: 'Basement Gate',
    propertyId: 'prop-1',
    propertyName: 'Brickstone',
    vehicleTypeId: 'veh-1',
    vehicleTypeName: 'Car',
    ratePlanName: null,
    billedMinutes: null,
    feeAmount: null,
    amountTendered: null,
    changeGiven: null,
    entryAttendantId: 'user-guard',
    entryAttendantName: 'Guard One',
    exitAttendantId: null,
    exitAttendantName: null,
    voidedAt: null,
    voidedReason: null,
    voidedById: null,
    voidedByName: null,
    ...overrides,
  };
}

function shift(overrides: Partial<ParkingOverviewShift> = {}): ParkingOverviewShift {
  return {
    id: 'shift-1',
    status: 'DECLARED',
    openedAt: '2026-09-07T00:00:00Z',
    declaredAt: '2026-09-07T08:00:00Z',
    confirmedAt: null,
    expectedCash: '500.00',
    declaredCash: '480.00',
    variance: '-20.00',
    note: null,
    terminalId: 'term-1',
    terminalName: 'Basement Gate',
    propertyId: 'prop-1',
    propertyName: 'Brickstone',
    attendantId: 'user-guard',
    attendantName: 'Guard One',
    confirmedById: null,
    confirmedByName: null,
    ...overrides,
  };
}

describe('elapsedLabel', () => {
  it('reads hours and minutes for a long stay', () => {
    expect(elapsedLabel('2026-09-07T08:35:00Z', NOW)).toBe('3h 25m');
  });

  it('drops the hour for a stay under one', () => {
    expect(elapsedLabel('2026-09-07T11:15:00Z', NOW)).toBe('45m');
  });

  it('shows 0m for the first minute rather than rounding up', () => {
    expect(elapsedLabel('2026-09-07T11:59:30Z', NOW)).toBe('0m');
  });

  it('clamps a terminal clock that runs fast', () => {
    expect(elapsedLabel('2026-09-07T12:05:00Z', NOW)).toBe('0m');
    expect(elapsedMinutes('2026-09-07T12:05:00Z', NOW)).toBe(0);
  });
});

describe('varianceState', () => {
  it('names a shortfall, an overage and an exact count', () => {
    expect(varianceState('-20.00')).toBe('short');
    expect(varianceState('35.50')).toBe('over');
    expect(varianceState('0.00')).toBe('balanced');
  });

  it('reads an undeclared shift as pending rather than balanced', () => {
    expect(varianceState(null)).toBe('pending');
    expect(varianceLabel(null)).toBe('Not declared');
  });

  it('labels either direction without a sign the reader has to decode', () => {
    expect(varianceLabel('-20.00')).toBe('Short 20.00');
    expect(varianceLabel('35.50')).toBe('Over 35.50');
    expect(varianceLabel('0.00')).toBe('Balanced');
  });
});

describe('badges', () => {
  it('separates the three stay states', () => {
    expect(sessionBadge('OPEN').label).toBe('In park');
    expect(sessionBadge('PAID').tone).toBe('success');
    expect(sessionBadge('VOID').tone).toBe('destructive');
  });

  it('flags a declared shift as work waiting on an admin', () => {
    expect(shiftBadge('DECLARED')).toEqual({ label: 'Awaiting confirm', tone: 'warning' });
    expect(shiftBadge('CONFIRMED').tone).toBe('success');
    expect(shiftBadge('OPEN').label).toBe('Open');
  });
});

describe('action guards', () => {
  it('offers a void only on an open stay, and only to an owner or admin', () => {
    expect(canVoid(session(), true)).toBe(true);
    expect(canVoid(session(), false)).toBe(false);
    expect(canVoid(session({ status: 'PAID' }), true)).toBe(false);
    expect(canVoid(session({ status: 'VOID' }), true)).toBe(false);
  });

  it('offers a confirm only on a declared shift', () => {
    expect(canConfirm(shift(), true)).toBe(true);
    expect(canConfirm(shift(), false)).toBe(false);
    expect(canConfirm(shift({ status: 'OPEN' }), true)).toBe(false);
    expect(canConfirm(shift({ status: 'CONFIRMED' }), true)).toBe(false);
  });
});
