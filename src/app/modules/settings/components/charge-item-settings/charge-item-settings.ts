import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ChargeItemResponse } from '../../../../core/models/charge-item.types';
import { BILL_TYPE_LABELS, BILL_TYPE_OPTIONS, type BillType } from '../../../../core/models/enums';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { sortLookupRows } from '../../../../shared/utils/lookup-order.util';
import { ChargeItemsService } from '../../services/charge-items.service';

/**
 * Settings → Charge items. Same shape as the property-type list, one row per
 * catalogue entry, but each row carries three things the onboarding wizard
 * needs: the label, the bill bucket it posts into, and an optional amount that
 * pre-fills the line when it is picked.
 */
@Component({
  selector: 'app-charge-item-settings',
  imports: [ReactiveFormsModule, PIcon, InputNumber, Select, PhpCurrencyPipe, Skeleton, StatusBadge],
  templateUrl: './charge-item-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChargeItemSettings {
  private readonly fb = inject(FormBuilder);
  private readonly chargeItems = inject(ChargeItemsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<ChargeItemResponse[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.items() === null && this.error() === null);

  readonly billTypeOptions = BILL_TYPE_OPTIONS;
  readonly billTypeLabels = BILL_TYPE_LABELS;

  /** Footer draft — the "add a charge" row. */
  readonly createForm = this.buildForm();
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  /** Inline draft for the row being edited, if any. */
  readonly editForm = this.buildForm();
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editError = signal<string | null>(null);

  /** Row currently waiting on an archive/restore round-trip. */
  readonly busyId = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);

  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  constructor() {
    this.load();
  }

  load(): void {
    this.items.set(null);
    this.error.set(null);
    this.chargeItems
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load charge items.')),
      });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createError.set('Use at least 2 characters.');
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.chargeItems
      .create(this.payloadOf(this.createForm))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.createForm.reset({ name: '', billType: 'OTHER', defaultAmount: null });
          this.replaceItem(created);
          this.flashId.set(created.id);
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(apiErrorMessage(error, 'Could not add the charge item.'));
        },
      });
  }

  startEdit(item: ChargeItemResponse): void {
    this.editForm.reset({
      name: item.name,
      billType: item.billType,
      defaultAmount: item.defaultAmount === null ? null : Number(item.defaultAmount),
    });
    this.editingId.set(item.id);
    this.editError.set(null);
    // The input renders on the next change-detection pass.
    queueMicrotask(() => this.editInput()?.nativeElement.focus());
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set(null);
  }

  submitEdit(): void {
    const id = this.editingId();
    if (!id) return;
    if (this.editForm.invalid) {
      this.editError.set('Use at least 2 characters.');
      return;
    }

    this.saving.set(true);
    this.editError.set(null);
    this.chargeItems
      .update(id, this.payloadOf(this.editForm))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.editingId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.editError.set(apiErrorMessage(error, 'Could not save the charge item.'));
        },
      });
  }

  confirmArchive(item: ChargeItemResponse): void {
    this.confirmation.confirm({
      header: 'Archive charge item',
      message: `Archive “${item.name}”? Leases already charging it are untouched. It just leaves the picker for new ones.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Archive', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.archive(item),
    });
  }

  restore(item: ChargeItemResponse): void {
    this.busyId.set(item.id);
    this.chargeItems
      .restore(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Restore failed',
            detail: apiErrorMessage(error, 'Could not restore the charge item.'),
          });
        },
      });
  }

  private archive(item: ChargeItemResponse): void {
    this.busyId.set(item.id);
    this.chargeItems
      .archive(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replaceItem(updated);
          this.toast.add({ severity: 'success', summary: 'Charge item archived' });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Archive failed',
            detail: apiErrorMessage(error, 'Could not archive the charge item.'),
          });
        },
      });
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      billType: ['OTHER' as BillType, [Validators.required]],
      // null = no default; the wizard then asks for the amount every time.
      defaultAmount: [null as number | null, [Validators.min(0)]],
    });
  }

  private payloadOf(form: ReturnType<ChargeItemSettings['buildForm']>) {
    const { name, billType, defaultAmount } = form.getRawValue();
    return { name: name.trim(), billType, defaultAmount };
  }

  /** Insert or update, keeping the order the server would have returned. */
  private replaceItem(item: ChargeItemResponse): void {
    this.items.update((items) =>
      sortLookupRows([...(items ?? []).filter((existing) => existing.id !== item.id), item]),
    );
  }
}
