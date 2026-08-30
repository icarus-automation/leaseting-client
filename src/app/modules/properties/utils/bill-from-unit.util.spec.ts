import { billFromUnit } from './bill-from-unit.util';
import type { UnitDetail, UnitOutstandingBill } from '../../../core/models/property.types';

const unit = {
  id: 'unit-1',
  unitNo: '1A',
  monthlyRent: '10000',
  mapCoordinates: null,
  notes: null,
  floorId: 'f1',
  propertyId: 'prop-1',
  createdAt: '',
  updatedAt: '',
  status: 'OCCUPIED',
  hasOverdueBills: false,
  activeLease: {
    id: 'lease-1',
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    monthlyRent: '10000',
    rentCharges: null,
    dueDay: 5,
    tenant: {
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
    expect(row?.lease.tenant.firstName).toBe('Ada');
    expect(row?.status).toBe('UNPAID');
  });

  it('returns null when the unit has no lease', () => {
    expect(billFromUnit({ ...unit, activeLease: null }, bill)).toBeNull();
  });
});
