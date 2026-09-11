import { billStatusBadge } from './bill-status.util';

describe('billStatusBadge', () => {
  it('labels Paid / Overdue / Partial / Unpaid for one concrete bill each', () => {
    expect(
      billStatusBadge({ status: 'PAID', dueDate: '2020-01-01', paidAmount: '8000' }),
    ).toEqual({ label: 'Paid', tone: 'success' });
    expect(
      billStatusBadge({ status: 'UNPAID', dueDate: '2020-01-01', paidAmount: '0' }),
    ).toEqual({ label: 'Overdue', tone: 'destructive' });
    expect(
      billStatusBadge({ status: 'UNPAID', dueDate: '2099-01-01', paidAmount: '2500' }),
    ).toEqual({ label: 'Partial', tone: 'vacant' });
    expect(
      billStatusBadge({ status: 'UNPAID', dueDate: '2099-01-01', paidAmount: '0' }),
    ).toEqual({ label: 'Unpaid', tone: 'warning' });
  });
});
