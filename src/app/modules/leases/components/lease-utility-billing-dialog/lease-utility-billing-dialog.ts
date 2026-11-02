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
  untracked,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProgressSpinner } from 'primeng/progressspinner';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { LeaseDetail, LeaseUtilityBilling } from '../../../../core/models/lease.types';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { UtilityBillingFields, utilityBillingGroup } from '../../../../shared/ui/utility-billing-fields/utility-billing-fields';
import { LeasesService } from '../../services/leases.service';

/** Edits whether Leaseting bills a lease's electricity and water. */
@Component({
  selector: 'app-lease-utility-billing-dialog',
  imports: [ProgressSpinner, ReactiveFormsModule, ErrorBanner, FormDialog, UtilityBillingFields],
  template: `
    <app-form-dialog
      #dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      heading="Utility billing"
      [subheading]="subheading()"
      [dirty]="group.dirty"
      width="30rem"
    >
      @if (errorMessage(); as message) {
        <app-error-banner class="mb-4" [message]="message" />
      }
      <form id="lease-utility-billing-form" [formGroup]="group" (ngSubmit)="onSubmit()" novalidate>
        <app-utility-billing-fields
          [group]="group"
          idPrefix="lease-utilities"
          legend="Utilities you bill on this lease"
          description="A utility run lists this lease only for what is checked. Bills already raised stay as they are."
        />
      </form>

      <ng-container dialog-footer>
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-base border border-border bg-background px-3.5 text-[13px] font-medium text-body transition-colors duration-150 ease-out hover:bg-surface motion-reduce:transition-none"
          (click)="dialog.requestClose()"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="lease-utility-billing-form"
          class="inline-flex h-9 items-center gap-2 rounded-base border-none bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 ease-out enabled:hover:bg-primary-hover enabled:active:bg-primary-active disabled:cursor-not-allowed disabled:opacity-[0.65] motion-reduce:transition-none"
          [disabled]="saving()"
        >
          @if (saving()) {
            <p-progress-spinner class="h-3.5 w-3.5 m-0 text-primary-foreground" strokeWidth="6" animationDuration=".65s" aria-hidden="true" />
          }
          <span>Save changes</span>
        </button>
      </ng-container>
    </app-form-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaseUtilityBillingDialog {
  private readonly leases = inject(LeasesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly lease = input.required<LeaseDetail>();
  readonly saved = output<LeaseUtilityBilling>();

  readonly group = utilityBillingGroup();
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly subheading = computed(() => {
    const lease = this.lease();
    return `Unit ${lease.unit.unitNo} · ${lease.resident.firstName} ${lease.resident.lastName}`;
  });

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const lease = this.lease();
      untracked(() => {
        this.group.reset({ billsElectricity: lease.billsElectricity, billsWater: lease.billsWater });
        this.errorMessage.set(null);
        this.saving.set(false);
      });
    });
  }

  onSubmit(): void {
    this.errorMessage.set(null);
    this.saving.set(true);
    this.leases
      .update(this.lease().id, this.group.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lease) => {
          this.saving.set(false);
          this.visible.set(false);
          this.saved.emit({ billsElectricity: lease.billsElectricity, billsWater: lease.billsWater });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not save the utility billing.'));
        },
      });
  }
}
