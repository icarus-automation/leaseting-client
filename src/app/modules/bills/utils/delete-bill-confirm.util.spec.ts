import { describe, expect, it } from 'vitest';

import type { BillListItem } from '../../../core/models/bill.types';
import { deleteBillConfirmMessage } from './delete-bill-confirm.util';

function unpaidBill(overrides: Partial<BillListItem> = {}): BillListItem {
  return {
    id: 'bill-1',
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
    ...overrides,
  };
}

describe('deleteBillConfirmMessage', () => {
  it('names the tenant, unit, type, amount, and due date', () => {
    expect(deleteBillConfirmMessage(unpaidBill())).toBe(
      'Delete the unpaid Rent bill of ₱8,500.00 for Ana Cruz on Unit 4A, due Sep 1, 2026? This cannot be undone.',
    );
  });
});
