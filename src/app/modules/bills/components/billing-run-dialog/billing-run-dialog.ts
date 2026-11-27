import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';
import type { Subscription } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { BillsService } from '../../services/bills.service';

export type BillingRunKind = 'rent' | 'dues';

interface RunCopy {
  heading: string;
  one: string;
  many: string;
  covers: string;
  nothingDue: string;
  failed: string;
}

const COPY: Record<BillingRunKind, RunCopy> = {
  rent: {
    heading: 'Generate rent bills',
    one: 'rent bill',
    many: 'rent bills',
    covers: 'Covers rent due in the next 7 days. Months already billed are skipped.',
    nothingDue: 'Nothing is due. Every active lease already has its upcoming rent bill.',
    failed: 'Could not generate rent bills',
  },
  dues: {
    heading: 'Generate association dues',
    one: 'association dues bill',
    many: 'association dues bills',
    covers: "Covers owners' dues for the next 7 days. Months already billed are skipped.",
    nothingDue: 'Nothing is due. Every owner already has their upcoming dues bill.',
    failed: 'Could not generate association dues',
  },
};

/**
 * Says how many rent or dues bills a run would create before it creates them.
 * The count comes from the API's preview, which picks and skips exactly as the
 * run does. With nothing due, Run stays off.
 */
@Component({
  selector: 'app-billing-run-dialog',
  imports: [ErrorBanner, FormDialog, ProgressSpinner],
  templateUrl: './billing-run-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingRunDialog {
  private readonly bills = inject(BillsService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model(false);
  readonly kind = input.required<BillingRunKind>();
  /** How many bills the run created, after a run that created any. */
  readonly created = output<number>();

  readonly count = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly running = signal(false);

  readonly copy = computed(() => COPY[this.kind()]);
  readonly noun = computed(() => (this.count() === 1 ? this.copy().one : this.copy().many));
  readonly canRun = computed(() => !this.loading() && !this.running() && (this.count() ?? 0) > 0);

  private preview: Subscription | null = null;

  constructor() {
    effect(() => {
      if (this.visible()) this.loadCount(this.kind());
    });
  }

  loadCount(kind = this.kind()): void {
    this.preview?.unsubscribe();
    this.count.set(null);
    this.error.set(null);
    this.loading.set(true);
    const request = kind === 'rent' ? this.bills.rentRunPreview() : this.bills.duesRunPreview();
    this.preview = request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ count }) => {
        this.loading.set(false);
        this.count.set(count);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(error, 'Could not check what is due.'));
      },
    });
  }

  run(): void {
    if (!this.canRun()) return;
    const kind = this.kind();
    const copy = this.copy();
    this.running.set(true);
    const request = kind === 'rent' ? this.bills.rentRun() : this.bills.duesRun();
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ created }) => {
        this.running.set(false);
        this.visible.set(false);
        this.toast.add(
          created > 0
            ? { severity: 'success', summary: `${created} ${created === 1 ? copy.one : copy.many} created` }
            : { severity: 'info', summary: 'Nothing was created', detail: copy.nothingDue },
        );
        if (created > 0) this.created.emit(created);
      },
      error: (error: unknown) => {
        this.running.set(false);
        this.toast.add({ severity: 'error', summary: copy.failed, detail: apiErrorMessage(error) });
      },
    });
  }
}
