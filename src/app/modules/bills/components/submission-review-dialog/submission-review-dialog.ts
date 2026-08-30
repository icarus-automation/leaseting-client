import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PaymentSubmissionResponse } from '../../../../core/models/payment-submission.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { ReasonDialog } from '../../../../shared/ui/reason-dialog/reason-dialog';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PaymentSubmissionsService } from '../../services/payment-submissions.service';
import { submissionStatusBadge } from '../../utils/submission-status.util';

@Component({
  selector: 'app-submission-review-dialog',
  imports: [DatePipe, PhpCurrencyPipe, ErrorBanner, FormDialog, PrivateImage, ReasonDialog, StatusBadge],
  templateUrl: './submission-review-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubmissionReviewDialog {
  private readonly submissions = inject(PaymentSubmissionsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly submissionId = input<string | null>(null);
  readonly reviewed = output<void>();

  readonly canMutate = this.auth.isFinancialAdmin;
  readonly billTypeLabels = BILL_TYPE_LABELS;
  readonly submission = signal<PaymentSubmissionResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly rejectVisible = signal(false);

  readonly badge = computed(() => {
    const status = this.submission()?.status;
    return status ? submissionStatusBadge(status) : null;
  });
  readonly proofUrl = computed(() => {
    const id = this.submission()?.id;
    return id ? this.submissions.proofUrl(id) : null;
  });
  readonly isPending = computed(() => this.submission()?.status === 'PENDING_REVIEW');

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const id = this.submissionId();
      if (id) this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.submissions
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (submission) => {
          this.submission.set(submission);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load this submission.'));
        },
      });
  }

  approve(): void {
    const submission = this.submission();
    if (!submission || !this.canMutate() || !this.isPending()) return;
    this.busy.set(true);
    this.submissions
      .approve(submission.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busy.set(false);
          this.submission.set(updated);
          this.toast.add({ severity: 'success', summary: 'Submission approved' });
          this.reviewed.emit();
          this.visible.set(false);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(error, 'Could not approve this submission.'));
        },
      });
  }

  onRejected(reason: string): void {
    const submission = this.submission();
    if (!submission || !this.canMutate()) return;
    this.busy.set(true);
    this.submissions
      .reject(submission.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busy.set(false);
          this.submission.set(updated);
          this.toast.add({ severity: 'success', summary: 'Submission rejected' });
          this.reviewed.emit();
          this.visible.set(false);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(error, 'Could not reject this submission.'));
        },
      });
  }
}
