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
  viewChild,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';

import { apiErrorMessage } from '../../../../core/models/api.types';
import { BILL_TYPE_OPTIONS, BillType } from '../../../../core/models/enums';
import type { LeaseListItem } from '../../../../core/models/lease.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { nextDueDate } from '../../../../shared/utils/date.util';
import { LeasesService } from '../../../leases/services/leases.service';
import { BillsService } from '../../services/bills.service';

interface LeaseOption {
  id: string;
  label: string;
  monthlyRent: string;
  dueDay: number;
}

@Component({
  selector: 'app-bill-form-dialog',
  imports: [ReactiveFormsModule, RouterLink, DatePicker, InputNumber, Select, PhpCurrencyPipe, ErrorBanner, FormDialog],
  templateUrl: './bill-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly bills = inject(BillsService);
  private readonly leases = inject(LeasesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  /** Preselects the lease and hides the picker (e.g. from the Leases page). */
  readonly presetLeaseId = input<string | null>(null);
  readonly saved = output<void>();

  readonly typeOptions = BILL_TYPE_OPTIONS;

  readonly form = this.fb.nonNullable.group({
    leaseId: ['', [Validators.required]],
    type: ['RENT' as BillType, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    dueDate: [null as Date | null, [Validators.required]],
    notes: [''],
  });
  readonly errors = createFormErrors(this.form);

  /** Meter-reading entry (electricity/water) — the server derives the amount. */
  readonly readingForm = this.fb.nonNullable.group({
    periodFrom: [null as Date | null, [Validators.required]],
    periodTo: [null as Date | null, [Validators.required]],
    previousReading: [null as number | null, [Validators.required, Validators.min(0)]],
    presentReading: [null as number | null, [Validators.required, Validators.min(0)]],
    multiplier: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    adminFeePct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    vatPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    whtPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });
  readonly readingErrors = createFormErrors(this.readingForm);
  readonly readingMode = signal(false);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly leaseOptions = signal<LeaseOption[]>([]);
  readonly loadingLeases = signal(false);

  private readonly selectedType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  readonly isUtilityType = computed(() => {
    const type = this.selectedType();
    return type === 'ELECTRICITY' || type === 'WATER';
  });

  private readonly readingValues = toSignal(this.readingForm.valueChanges, {
    initialValue: this.readingForm.getRawValue(),
  });
  /** Live preview mirroring the server math: consumed × rate, +admin fee, +VAT, −WHT. */
  readonly breakdown = computed(() => {
    if (!this.readingMode()) return null;
    const { previousReading, presentReading, multiplier, adminFeePct, vatPct, whtPct } = this.readingValues();
    if (
      previousReading == null ||
      presentReading == null ||
      multiplier == null ||
      presentReading < previousReading
    ) {
      return null;
    }
    const consumed = presentReading - previousReading;
    const total = round2(consumed * multiplier);
    const adminFee = round2(total * ((adminFeePct ?? 0) / 100));
    const vat = round2(total * ((vatPct ?? 0) / 100));
    const wht = round2(total * ((whtPct ?? 0) / 100));
    return { consumed, total, adminFee, vat, wht, netDue: round2(total + adminFee + vat - wht) };
  });

  private readonly dialog = viewChild.required(FormDialog);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.errors.reset();
      this.readingErrors.reset();
      this.errorMessage.set(null);
      this.saving.set(false);
      this.readingMode.set(false);
      this.form.reset({
        leaseId: this.presetLeaseId() ?? '',
        type: 'RENT',
        amount: null,
        dueDate: null,
        notes: '',
      });
      this.readingForm.reset({
        periodFrom: null,
        periodTo: null,
        previousReading: null,
        presentReading: null,
        multiplier: null,
        adminFeePct: 0,
        vatPct: 0,
        whtPct: 0,
      });
      if (!this.presetLeaseId()) this.loadLeases();
    });

    // Smart defaults: picking a lease (or switching back to RENT) pre-fills
    // the amount from the lease's rent and the due date from its due day —
    // the common case becomes two clicks instead of four fields.
    this.form.controls.leaseId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyLeaseDefaults();
        if (this.readingMode()) this.prefillFromLastReading();
      });
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyLeaseDefaults();
        // Readings only make sense for utility bills.
        if (!this.isUtilityType()) this.toggleReadingMode(false);
        else if (this.readingMode()) this.prefillFromLastReading();
      });
  }

  toggleReadingMode(on: boolean): void {
    this.readingMode.set(on);
    const amountControl = this.form.controls.amount;
    if (on) {
      // Amount becomes derived — the reading form is the source of truth.
      amountControl.disable();
      amountControl.setValue(null);
      this.prefillFromLastReading();
    } else {
      amountControl.enable();
      this.readingErrors.reset();
    }
  }

  /**
   * Carries the previous cycle forward: the last utility bill's present
   * reading becomes this bill's previous reading (and its rate the default),
   * so staff only type the fresh meter figure. Untouched fields only — a
   * manually entered value always wins.
   */
  private prefillFromLastReading(): void {
    const { leaseId, type } = this.form.getRawValue();
    if (!leaseId || (type !== 'ELECTRICITY' && type !== 'WATER')) return;

    this.bills
      .list({ leaseId, type, hasReading: true, limit: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const detail = result.data[0]?.utilityDetail;
        if (!detail || !this.readingMode()) return;
        const previousControl = this.readingForm.controls.previousReading;
        if (previousControl.pristine && previousControl.value === null) {
          previousControl.setValue(Number(detail.presentReading));
        }
        const multiplierControl = this.readingForm.controls.multiplier;
        if (multiplierControl.pristine && multiplierControl.value === null) {
          multiplierControl.setValue(Number(detail.multiplier));
        }
      });
  }

  private applyLeaseDefaults(): void {
    const { leaseId, type } = this.form.getRawValue();
    if (type !== 'RENT') return;
    const option = this.leaseOptions().find((lease) => lease.id === leaseId);
    if (!option) return;

    const amountControl = this.form.controls.amount;
    if (amountControl.value === null && option.monthlyRent) {
      const rent = Number(option.monthlyRent);
      if (!Number.isNaN(rent) && rent > 0) amountControl.setValue(rent);
    }

    const dueControl = this.form.controls.dueDate;
    if (dueControl.value === null) {
      dueControl.setValue(nextDueDate(option.dueDay));
    }
  }

  onSubmit(addAnother = false): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    const useReading = this.readingMode() && this.isUtilityType();
    if (useReading) this.readingErrors.submitted.set(true);

    if (this.form.invalid || (useReading && this.readingForm.invalid)) {
      this.form.markAllAsTouched();
      if (useReading) this.readingForm.markAllAsTouched();
      return;
    }

    const { leaseId, type, amount, dueDate, notes } = this.form.getRawValue();
    if (dueDate === null) return;

    let payloadAmount = amount;
    let utilityDetail: NonNullable<Parameters<BillsService['create']>[1]['utilityDetail']> | undefined;
    if (useReading) {
      const breakdown = this.breakdown();
      const reading = this.readingForm.getRawValue();
      if (!breakdown || reading.periodFrom === null || reading.periodTo === null) return;
      if (reading.presentReading! < reading.previousReading!) {
        this.errorMessage.set('Present reading must not be below the previous reading.');
        return;
      }
      if (breakdown.netDue <= 0) {
        this.errorMessage.set('The amount comes out at zero. Check the readings and the rate.');
        return;
      }
      payloadAmount = breakdown.netDue;
      utilityDetail = {
        periodFrom: formatDate(reading.periodFrom, 'yyyy-MM-dd', 'en-US'),
        periodTo: formatDate(reading.periodTo, 'yyyy-MM-dd', 'en-US'),
        previousReading: reading.previousReading!,
        presentReading: reading.presentReading!,
        multiplier: reading.multiplier!,
        adminFeeRate: (reading.adminFeePct ?? 0) / 100,
        vatRate: (reading.vatPct ?? 0) / 100,
        whtRate: (reading.whtPct ?? 0) / 100,
      };
    }
    if (payloadAmount === null) return;

    this.saving.set(true);
    this.bills
      .create(leaseId, {
        type,
        amount: payloadAmount,
        dueDate: formatDate(dueDate, 'yyyy-MM-dd', 'en-US'),
        notes: notes.trim() || undefined,
        utilityDetail,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
          if (addAnother) {
            // Billing runs log several charges in a row — keep the lease
            // selection, clear the specifics, and refocus for the next one.
            this.toggleReadingMode(false);
            this.form.reset({ leaseId, type, amount: null, dueDate: null, notes: '' });
            this.readingForm.reset({
              periodFrom: null,
              periodTo: null,
              previousReading: null,
              presentReading: null,
              multiplier: null,
              adminFeePct: 0,
              vatPct: 0,
              whtPct: 0,
            });
            this.errors.reset();
            this.readingErrors.reset();
            this.dialog().focusFirstField();
          } else {
            this.visible.set(false);
          }
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not create the bill.'));
        },
      });
  }

  private loadLeases(): void {
    this.loadingLeases.set(true);
    this.leases
      .list({ active: true, limit: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.leaseOptions.set(result.data.map(toLeaseOption));
          this.loadingLeases.set(false);
        },
        error: () => {
          this.loadingLeases.set(false);
          this.errorMessage.set('Could not load active leases.');
        },
      });
  }
}

function toLeaseOption(lease: LeaseListItem): LeaseOption {
  return {
    id: lease.id,
    label: `Unit ${lease.unit.unitNo} · ${lease.unit.property.name} · ${lease.tenant.firstName} ${lease.tenant.lastName}`,
    monthlyRent: lease.monthlyRent,
    dueDay: lease.dueDay,
  };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
