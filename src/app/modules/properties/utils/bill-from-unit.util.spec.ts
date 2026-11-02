import { billFromUnit } from './bill-from-unit.util';
import type { UnitDetail, UnitOutstandingBill } from '../../../core/models/property.types';

const unit = {
  id: 'unit-1',
  unitNo: '1A',
  monthlyRent: '10000',
  pricingBasis: 'FIXED',
  floorAreaSqm: null,
  ratePerSqmOverride: null,
  effectiveRatePerSqm: null,
  computedMonthlyRent: null,
  mapCoordinates: null,
  notes: null,
  floorId: 'f1',
  propertyId: 'prop-1',
  createdAt: '',
  updatedAt: '',
  status: 'OCCUPIED',
  hasOverdueBills: false,
  mode: 'RENTAL',
  currentOwnership: null,
  activeLease: {
    id: 'lease-1',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    monthlyRent: '10000',
    rentPricingBasis: 'FIXED',
    rentFloorAreaSqm: null,
    rentRatePerSqm: null,
    rentCharges: null,
    dueDay: 5,
    resident: {
      id: 't1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: null,
      contactNo: '0917',
    },
    outstandingBills: [],
  },
} as UnitDetail;

const bill: UnitOutstandingBill = {
  id: 'bill-1',
  type: 'RENT',
  amount: '10000',
  dueDate: '2026-09-05',
};

describe('billFromUnit', () => {
  it('opens Record Payment with the unit tenant and bill id, not a mark-paid shortcut', () => {
    const row = billFromUnit(unit, bill);
    expect(row?.id).toBe('bill-1');
    expect(row?.lease?.resident.firstName).toBe('Ada');
    expect(row?.status).toBe('UNPAID');
  });

  it('returns null when the unit has no lease', () => {
    expect(billFromUnit({ ...unit, activeLease: null }, bill)).toBeNull();
  });

  it('opens an owner bill when the sold unit has no lease', () => {
    const ownerUnit = {
      ...unit,
      mode: 'CONDO',
      status: 'SOLD',
      activeLease: null,
      currentOwnership: {
        id: 'ownership-1',
        startDate: '2026-01-01',
        endDate: null,
        price: '2500000',
        note: null,
        billsElectricity: true,
        billsWater: true,
        resident: {
          id: 'owner-1',
          firstName: 'Grace',
          lastName: 'Hopper',
          email: null,
          contactNo: '0918',
        },
        outstandingBills: [],
      },
    } as UnitDetail;

    const row = billFromUnit(ownerUnit, { ...bill, type: 'ASSOCIATION_DUES' });
    expect(row?.lease).toBeNull();
    expect(row?.ownership?.resident.firstName).toBe('Grace');
    expect(row?.ownershipId).toBe('ownership-1');
  });
});
