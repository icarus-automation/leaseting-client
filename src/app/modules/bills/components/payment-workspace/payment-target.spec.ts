import type { BillListItem } from '../../../../core/models/bill.types';
import { paymentTargetFromRow } from './payment-target';

const bill = {
  id: 'bill-1',
  type: 'RENT',
  amount: '10000',
  dueDate: '2026-09-15',
  status: 'UNPAID',
  paidAt: null,
  notes: null,
  leaseId: 'lease-1',
  createdAt: '',
  updatedAt: '',
  utilityDetail: null,
  paidAmount: '0',
  balance: '10000',
  lease: {
    id: 'lease-1',
    tenant: { id: 'tenant-1', firstName: 'Ada', lastName: 'Lovelace' },
    unit: { id: 'unit-1', unitNo: '1A', property: { id: 'prop-1', name: 'Mabini' } },
  },
} satisfies BillListItem;

describe('paymentTargetFromRow', () => {
  it('keeps the seed id as the bill id', () => {
    expect(paymentTargetFromRow(bill)).toEqual({ billId: 'bill-1', seed: bill });
  });

  it('copies a detail payments array onto history', () => {
    const detail = { ...bill, payments: [] };
    expect(paymentTargetFromRow(detail)).toEqual({
      billId: 'bill-1',
      seed: detail,
      history: [],
    });
  });
});
