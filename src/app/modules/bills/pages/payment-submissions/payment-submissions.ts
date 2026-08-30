import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PageMeta } from '../../../../core/models/api.types';
import type {
  PaymentSubmissionResponse,
  PaymentSubmissionStatus,
} from '../../../../core/models/payment-submission.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { SubmissionReviewDialog } from '../../components/submission-review-dialog/submission-review-dialog';
import { PaymentSubmissionsService } from '../../services/payment-submissions.service';
import { submissionStatusBadge } from '../../utils/submission-status.util';

type QueueFilter = 'PENDING_REVIEW' | 'ALL' | PaymentSubmissionStatus;

const FILTER_OPTIONS: { label: string; value: QueueFilter }[] = [
  { label: 'Pending review', value: 'PENDING_REVIEW' },
  { label: 'All history', value: 'ALL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

@Component({
  selector: 'app-payment-submissions',
  imports: [
    DatePipe,
    RouterLink,
    FormsModule,
    PIcon,
    Select,
    PhpCurrencyPipe,
    EmptyState,
    Pagination,
    Skeleton,
    StatusBadge,
    SubmissionReviewDialog,
  ],
  templateUrl: './payment-submissions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentSubmissions {
  private readonly submissionsApi = inject(PaymentSubmissionsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canMutate = this.auth.isFinancialAdmin;
  readonly billTypeLabels = BILL_TYPE_LABELS;
  readonly filterOptions = FILTER_OPTIONS;

  readonly items = signal<PaymentSubmissionResponse[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly pendingCount = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<QueueFilter>('PENDING_REVIEW');
  readonly reviewVisible = signal(false);
  readonly reviewId = signal<string | null>(null);
  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    this.load(1);
    this.loadPendingCount();
  }

  statusBadge(status: PaymentSubmissionResponse['status']) {
    return submissionStatusBadge(status);
  }

  onFilterChange(value: QueueFilter): void {
    this.filter.set(value);
    this.load(1);
  }

  openReview(submission: PaymentSubmissionResponse): void {
    this.reviewId.set(submission.id);
    this.reviewVisible.set(true);
  }

  onReviewed(): void {
    this.load(this.meta()?.page ?? 1);
    this.loadPendingCount();
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    const filter = this.filter();
    this.submissionsApi
      .list({
        page,
        limit: 10,
        status: filter === 'ALL' ? undefined : filter,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pageResult) => {
          this.items.set(pageResult.data);
          this.meta.set(pageResult.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load payment submissions.'));
        },
      });
  }

  private loadPendingCount(): void {
    this.submissionsApi
      .pendingCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ pendingCount }) => this.pendingCount.set(pendingCount),
      });
  }
}
