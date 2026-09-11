import { describe, expect, it } from 'vitest';

import type { BillListItem } from '../../../core/models/bill.types';
import { queriedBillToOpen } from './queried-bill.util';

function bill(id: string): BillListItem {
  return {
    id,
    type: 'RENT',
    amount: '8500',
    dueDate: '2026-09-01',
    status: 'UNPAID',
    paidAt: null,
    notes: null,
    leaseId: 'lease-1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    utilityDetail: null,
    paidAmount: '0',
    balance: '8500',
    lease: {
      id: 'lease-1',
      tenant: { id: 't-1', firstName: 'Ana', lastName: 'Cruz' },
      unit: {
        id: 'u-1',
        unitNo: '4A',
        property: { id: 'p-1', name: 'Mabini' },
      },
    },
  };
}

describe('queriedBillToOpen', () => {
  const bills = [bill('bill-1'), bill('bill-2')];

  it('returns the matching bill the first time', () => {
    expect(queriedBillToOpen(bills, 'bill-2', null)?.id).toBe('bill-2');
  });

  it('does not reopen the same billId after a reload', () => {
    expect(queriedBillToOpen(bills, 'bill-1', 'bill-1')).toBeNull();
  });

  it('returns null when the list does not contain that bill', () => {
    expect(queriedBillToOpen(bills, 'missing', null)).toBeNull();
  });
});
