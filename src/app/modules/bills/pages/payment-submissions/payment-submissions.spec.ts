import { Component, input, model, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { PendingPaymentSubmissionsService } from '../../../../core/payment-submissions/pending-payment-submissions.service';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { SubmissionReviewDialog } from '../../components/submission-review-dialog/submission-review-dialog';
import { PaymentSubmissionsService } from '../../services/payment-submissions.service';
import { PaymentSubmissions } from './payment-submissions';

@Component({ selector: 'app-empty-state', template: '' })
class EmptyStateStub {
  readonly icon = input('');
  readonly heading = input('');
  readonly description = input('');
}

@Component({ selector: 'app-pagination', template: '' })
class PaginationStub {
  readonly meta = input<unknown>(null);
  readonly pageChange = output<number>();
}

@Component({ selector: 'app-skeleton', template: '' })
class SkeletonStub {
  readonly variant = input('');
}

@Component({ selector: 'app-status-badge', template: '' })
class StatusBadgeStub {
  readonly tone = input('');
  readonly label = input('');
  readonly count = input<number | null>(null);
}

@Component({ selector: 'app-submission-review-dialog', template: '' })
class SubmissionReviewDialogStub {
  readonly visible = model(false);
  readonly submissionId = input<string | null>(null);
  readonly reviewed = output<void>();
}

describe('PaymentSubmissions', () => {
  const api = {
    list: vi.fn(),
  };
  const pendingSubmissions = {
    refresh: vi.fn(),
  };
  let fixture: ComponentFixture<PaymentSubmissions>;
  let component: PaymentSubmissions;

  beforeEach(async () => {
    api.list.mockReturnValue(
      of({ data: [], meta: { total: 0, page: 1, limit: 10, lastPage: 1 } }),
    );

    await TestBed.configureTestingModule({
      imports: [PaymentSubmissions],
      providers: [
        { provide: AuthService, useValue: { isFinancialAdmin: signal(true) } },
        provideRouter([]),
        { provide: PaymentSubmissionsService, useValue: api },
        { provide: PendingPaymentSubmissionsService, useValue: pendingSubmissions },
      ],
    })
      .overrideComponent(PaymentSubmissions, {
        remove: {
          imports: [EmptyState, Pagination, Skeleton, StatusBadge, SubmissionReviewDialog],
        },
        add: {
          imports: [
            EmptyStateStub,
            PaginationStub,
            SkeletonStub,
            StatusBadgeStub,
            SubmissionReviewDialogStub,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PaymentSubmissions);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    if (fixture) fixture.destroy();
    vi.clearAllMocks();
  });

  function tab(label: string): HTMLButtonElement {
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('app-segmented-control button')];
    const match = buttons.find((button) => button.textContent?.trim() === label);
    if (!match) throw new Error(`${label} tab not rendered`);
    return match;
  }

  it('uses status tabs without counts and selects Pending review by default', () => {
    expect(component.filter()).toBe('PENDING_REVIEW');
    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 10, status: 'PENDING_REVIEW' });
    expect(tab('Pending review').getAttribute('aria-pressed')).toBe('true');
    expect(tab('Approved')).toBeTruthy();
    expect(tab('Rejected')).toBeTruthy();
    expect(tab('Cancelled')).toBeTruthy();
    expect(tab('All history')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p-select')).toBeNull();
  });

  it('loads the selected status and leaves All history unfiltered', async () => {
    api.list.mockClear();

    tab('Approved').click();
    await fixture.whenStable();

    expect(component.filter()).toBe('APPROVED');
    expect(api.list).toHaveBeenLastCalledWith({ page: 1, limit: 10, status: 'APPROVED' });

    tab('All history').click();
    await fixture.whenStable();

    expect(component.filter()).toBe('ALL');
    expect(api.list).toHaveBeenLastCalledWith({ page: 1, limit: 10, status: undefined });
  });

  it('refreshes the sidebar pending count after a review', () => {
    pendingSubmissions.refresh.mockClear();

    component.onReviewed();

    expect(pendingSubmissions.refresh).toHaveBeenCalledTimes(1);
  });
});
