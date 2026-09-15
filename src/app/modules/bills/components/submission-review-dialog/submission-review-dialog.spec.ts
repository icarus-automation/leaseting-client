import { Component, input, model, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { PaymentSubmissionResponse } from '../../../../core/models/payment-submission.types';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PaymentSubmissionsService } from '../../services/payment-submissions.service';
import { SubmissionReviewDialog } from './submission-review-dialog';

@Component({
  selector: 'app-form-dialog',
  template: '<ng-content /><ng-content select="[dialog-footer]" />',
})
class FormDialogStub {
  readonly visible = model(false);
  readonly heading = input('');
  readonly subheading = input<string | null>(null);
  readonly width = input('');
  readonly dirty = input(false);

  requestClose(): void {
    this.visible.set(false);
  }
}

@Component({ selector: 'app-private-image', template: '' })
class PrivateImageStub {
  readonly url = input.required<string>();
  readonly alt = input('');
  readonly fit = input<'contain' | 'width'>('contain');
  readonly src = signal<string | null>('blob:payment-proof');
}

@Component({ selector: 'app-status-badge', template: '' })
class StatusBadgeStub {
  readonly tone = input('');
  readonly label = input('');
}

function submission(overrides: Partial<PaymentSubmissionResponse> = {}): PaymentSubmissionResponse {
  return {
    id: 'submission-1',
    status: 'PENDING_REVIEW',
    amount: '1938.44',
    paidOn: '2026-09-15',
    referenceNo: 'GCASH-123',
    tenantNote: null,
    destinationName: 'Brickstone GCash',
    accountName: 'Brickstone Boarding House',
    accountNumber: '09178000001',
    destinationId: 'destination-1',
    rejectionReason: null,
    reviewedAt: null,
    reviewedByUserId: null,
    cancelledAt: null,
    billId: 'bill-1',
    leaseId: 'lease-1',
    tenantId: 'tenant-1',
    paymentId: null,
    createdAt: '2026-09-15T10:00:00.000Z',
    updatedAt: '2026-09-15T10:00:00.000Z',
    tenant: { id: 'tenant-1', firstName: 'Ace Gabriel', lastName: 'Pasiliao' },
    bill: {
      id: 'bill-1',
      type: 'ELECTRICITY',
      amount: '1938.44',
      dueDate: '2026-09-20',
      status: 'UNPAID',
      lease: {
        unit: {
          unitNo: '106',
          property: { id: 'property-1', name: 'Brickstone Boarding House' },
        },
      },
    },
    payment: null,
    ...overrides,
  };
}

describe('SubmissionReviewDialog', () => {
  const api = {
    get: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    proofUrl: vi.fn((id: string) => `/payment-submissions/${id}/proof`),
  };
  let fixture: ComponentFixture<SubmissionReviewDialog>;
  let component: SubmissionReviewDialog;
  let reviewed: number;

  beforeEach(async () => {
    api.get.mockReturnValue(of(submission()));

    await TestBed.configureTestingModule({
      imports: [SubmissionReviewDialog],
      providers: [
        MessageService,
        { provide: AuthService, useValue: { isFinancialAdmin: signal(true) } },
        { provide: PaymentSubmissionsService, useValue: api },
      ],
    })
      .overrideComponent(SubmissionReviewDialog, {
        remove: { imports: [FormDialog, PrivateImage, StatusBadge] },
        add: { imports: [FormDialogStub, PrivateImageStub, StatusBadgeStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(SubmissionReviewDialog);
    component = fixture.componentInstance;
    reviewed = 0;
    component.reviewed.subscribe(() => reviewed++);
    fixture.componentRef.setInput('submissionId', 'submission-1');
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  function button(label: string): HTMLButtonElement {
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button')];
    const match = buttons.find((element) => element.textContent?.trim() === label);
    if (!match) throw new Error(`${label} button not rendered`);
    return match;
  }

  it('shows a fitted proof preview, full-size link, and inline optional reason', () => {
    const preview = fixture.nativeElement.querySelector('#proof-preview');
    const fullSize = fixture.nativeElement.querySelector('a[target="_blank"]') as HTMLAnchorElement;

    expect(preview?.querySelector('app-private-image')).toBeTruthy();
    expect(fullSize.textContent?.trim()).toBe('Open full size');
    expect(fullSize.getAttribute('href')).toBe('blob:payment-proof');
    expect(fixture.nativeElement.querySelector('#rejection-reason')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Reason for the tenant (optional)');
    expect(fixture.nativeElement.querySelector('app-reason-dialog')).toBeNull();
  });

  it('rejects with an optional blank reason from the review modal', async () => {
    api.reject.mockReturnValue(
      of(submission({ status: 'REJECTED', rejectionReason: null })),
    );

    button('Reject').click();
    await fixture.whenStable();

    expect(api.reject).toHaveBeenCalledWith('submission-1', '');
    expect(reviewed).toBe(1);
    expect(component.visible()).toBe(false);
  });

  it('approves the exact submitted amount from the review modal', async () => {
    api.approve.mockReturnValue(
      of(submission({ status: 'APPROVED', paymentId: 'payment-1' })),
    );

    button('Approve exact amount').click();
    await fixture.whenStable();

    expect(api.approve).toHaveBeenCalledWith('submission-1');
    expect(reviewed).toBe(1);
    expect(component.visible()).toBe(false);
  });
});
