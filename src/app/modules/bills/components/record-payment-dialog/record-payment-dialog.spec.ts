import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import type { BillDetail, BillListItem, PaymentResponse } from '../../../../core/models/bill.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { PaymentDestinationsService } from '../../../settings/services/payment-destinations.service';
import { BillsService } from '../../services/bills.service';
import { RecordPaymentDialog } from './record-payment-dialog';

const UNPAID: BillListItem = {
  id: 'bill-1',
  type: 'OTHER',
  amount: '100.00',
  dueDate: '2026-12-02',
  status: 'UNPAID',
  paidAt: null,
  notes: null,
  leaseId: 'lease-1',
  createdAt: '',
  updatedAt: '',
  utilityDetail: null,
  chargeName: null,
  label: 'Other Charges',
  paidAmount: '0.00',
  balance: '100.00',
  lease: {
    id: 'lease-1',
    resident: { id: 'resident-1', firstName: 'Ace Gabriel', lastName: 'Pasiliao' },
    unit: { id: 'unit-1', unitNo: '106', property: { id: 'prop-1', name: 'Brickstone Boarding House' } },
  },
};
const PAID: BillListItem = { ...UNPAID, status: 'PAID', paidAt: '2026-11-21T00:00:00Z', paidAmount: '100.00', balance: '0.00' };

const ONLINE_PAYMENT: PaymentResponse = {
  id: 'pay-1',
  amount: '100.00',
  paidOn: '2026-11-21',
  method: 'ONLINE',
  destinationId: 'dest-1',
  destination: { id: 'dest-1', displayName: 'Brickstone Maya', type: 'E_WALLET', providerName: 'Maya' },
  checkNumber: null,
  checkBank: null,
  checkDate: null,
  referenceNo: null,
  notes: null,
  hasReceipt: true,
  source: 'SUBMISSION',
  isVoided: false,
  voidedAt: null,
  voidReason: null,
  createdByUserId: 'user-1',
  billId: 'bill-1',
  submissionId: 'sub-1',
  createdAt: '2026-11-21T00:00:00Z',
};

describe('RecordPaymentDialog', () => {
  let fixture: ComponentFixture<RecordPaymentDialog>;

  async function open(bill: BillListItem, detail: Partial<BillDetail> = {}): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [RecordPaymentDialog],
      providers: [
        MessageService,
        { provide: ConfirmService, useValue: { danger: vi.fn() } },
        { provide: AuthService, useValue: { can: () => true } },
        { provide: PaymentDestinationsService, useValue: { list: () => of([]) } },
        {
          provide: BillsService,
          useValue: { get: () => of({ ...bill, payments: [ONLINE_PAYMENT], ...detail }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecordPaymentDialog);
    fixture.componentRef.setInput('bill', bill);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = () => document.body.textContent?.replace(/\s+/g, ' ') ?? '';
  const recordButton = () =>
    Array.from(document.body.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Record payment');

  afterEach(() => fixture?.destroy());

  it('opens a paid bill as its payment history, with no form and no Record button', async () => {
    await open(PAID, { status: 'PAID', paidAmount: '100.00', balance: '0.00' });

    expect(fixture.componentInstance.heading()).toBe('Payments · Other');
    expect(document.body.querySelector('#payment-form')).toBeNull();
    expect(recordButton()).toBeUndefined();
    expect(text()).toContain('This bill is paid in full.');
    expect(text()).toContain('Online · Brickstone Maya');
  });

  it('offers the form while the bill has a balance', async () => {
    await open(UNPAID, { payments: [] });

    expect(fixture.componentInstance.heading()).toBe('Record payment · Other');
    expect(document.body.querySelector('#payment-form')).not.toBeNull();
    expect(recordButton()).toBeDefined();
  });

  it('brings the form back when a void reopens the bill', async () => {
    await open(PAID, { status: 'PAID', paidAmount: '100.00', balance: '0.00' });
    const workspace = fixture.componentInstance.workspace()!;

    workspace.balance.set('100.00');
    fixture.detectChanges();

    expect(fixture.componentInstance.heading()).toBe('Record payment · Other');
    expect(document.body.querySelector('#payment-form')).not.toBeNull();
  });
});
