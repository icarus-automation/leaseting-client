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
  viewChild,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { ProgressSpinner } from 'primeng/progressspinner';


import { apiErrorMessage } from '../../../../core/models/api.types';
import { CHARGE_FREQUENCY_LABELS, type ChargeItemResponse } from '../../../../core/models/charge-item.types';
import { BILL_TYPE_LABELS, BillType, MANUAL_BILL_TYPE_OPTIONS } from '../../../../core/models/enums';
import type { LeaseListItem } from '../../../../core/models/lease.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { nextDueDate } from '../../../../shared/utils/date.util';
import { leaseBillsType } from '../../../../shared/utils/lease-utility-billing.util';
import { LeasesService } from '../../../leases/services/leases.service';
import { ChargeItemsService } from '../../../settings/services/charge-items.service';
import { BillsService } from '../../services/bills.service';
import { PesoInput } from '../../../../shared/ui/peso-input/peso-input';
import { UtilityChargeLines } from '../../../../shared/ui/utility-charge-lines/utility-charge-lines';
import { UTILITY_TAX_BASIS_LABELS, utilityChargeLines } from '../../../../shared/utils/utility-breakdown.util';
import { SegmentedControl, type SegmentedOption } from '../../../../shared/ui/segmented-control/segmented-control';
import type { UtilityTaxBasis } from '../../../../core/models/bill.types';
import { computeRow } from '../../pages/utility-run/utility-run-math.util';

interface LeaseOption {
  id: string;
  label: string;
  monthlyRent: string;
  dueDay: number;
  billsElectricity: boolean;
  billsWater: boolean;
}

@Component({
  selector: 'app-bill-form-dialog',
  imports: [ProgressSpinner, ReactiveFormsModule, RouterLink, DatePicker, InputNumber, Select, ErrorBanner, FormDialog, PesoInput, UtilityChargeLines, SegmentedControl],
  templateUrl: './bill-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly bills = inject(BillsService);
  private readonly leases = inject(LeasesService);
  private readonly chargeItemsApi = inject(ChargeItemsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly presetLeaseId = input<string | null>(null);
  readonly saved = output<void>();

  readonly form = this.fb.nonNullable.group({
    leaseId: ['', [Validators.required]],
    chargeItemId: [''],
    type: ['RENT' as BillType, [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    dueDate: [null as Date | null, [Validators.required]],
    notes: [''],
  });
  readonly errors = createFormErrors(this.form);

  readonly readingForm = this.fb.nonNullable.group({
    periodFrom: [null as Date | null, [Validators.required]],
    periodTo: [null as Date | null, [Validators.required]],
    previousReading: [null as number | null, [Validators.required, Validators.min(0)]],
    presentReading: [null as number | null, [Validators.required, Validators.min(0)]],
    multiplier: [null as number | null, [Validators.required, Validators.min(0.0001)]],
    adminFeePct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    vatPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    taxBasis: ['WHOLE_CHARGE' as UtilityTaxBasis],
    whtPct: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });
  readonly readingErrors = createFormErrors(this.readingForm);
  readonly readingMode = signal(false);
  readonly taxBasisOptions: SegmentedOption<UtilityTaxBasis>[] = (['WHOLE_CHARGE', 'ADMIN_FEE'] as const).map((value) => ({
    value,
    label: UTILITY_TAX_BASIS_LABELS[value],
  }));

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly leaseOptions = signal<LeaseOption[]>([]);
  readonly chargeItems = signal<ChargeItemResponse[]>([]);
  /** Live items staff may bill by hand, monthly or one-time. System items are billed by Leaseting alone. */
  readonly chargeOptions = computed(() =>
    this.chargeItems()
      .filter((item) => !item.isArchived && !item.isSystem)
      .map((item) => ({ value: item.id, label: `${item.name} · ${CHARGE_FREQUENCY_LABELS[item.frequency]}` })),
  );
  readonly loadingLeases = signal(false);

  private readonly selectedType = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.value,
  });
  readonly isUtilityType = computed(() => {
    const type = this.selectedType();
    return type === 'ELECTRICITY' || type === 'WATER';
  });

  private readonly selectedLeaseId = toSignal(this.form.controls.leaseId.valueChanges, {
    initialValue: this.form.controls.leaseId.value,
  });
  /** The chosen lease, when it came from the picker (a preset lease is not loaded). */
  private readonly selectedLease = computed(
    () => this.leaseOptions().find((lease) => lease.id === this.selectedLeaseId()) ?? null,
  );

  /** Electricity and water are offered only where the lease has Leaseting bill them; the API refuses the rest. */
  readonly typeOptions = computed(() => {
    const lease = this.selectedLease();
    return MANUAL_BILL_TYPE_OPTIONS.map((option) => ({
      ...option,
      disabled: lease !== null && !leaseBillsType(lease, option.value),
    }));
  });

  readonly unbilledTypeHint = computed(() => {
    const lease = this.selectedLease();
    const type = this.selectedType();
    if (!lease || leaseBillsType(lease, type)) return null;
    return `Leaseting doesn't bill ${BILL_TYPE_LABELS[type].toLowerCase()} on this lease. Change it on the lease, under Utility billing.`;
  });

  protected readonly readingValues = toSignal(this.readingForm.valueChanges, {
    initialValue: this.readingForm.getRawValue(),
  });
  /** The bill as it will read once created, with the same math the API stores. */
  readonly breakdown = computed(() => {
    if (!this.readingMode()) return null;
    const { previousReading, presentReading, multiplier, adminFeePct, vatPct, taxBasis, whtPct } = this.readingValues();
    if (previousReading == null || presentReading == null || multiplier == null) return null;
    const rates = {
      ratePerUnit: multiplier,
      adminFeePct: adminFeePct ?? 0,
      vatPct: vatPct ?? 0,
      taxBasis: taxBasis ?? 'WHOLE_CHARGE',
      whtPct: whtPct ?? 0,
    };
    const math = computeRow(previousReading, presentReading, rates);
    if (!math) return null;
    return {
      consumed: math.consumed,
      netDue: math.netDue,
      lines: utilityChargeLines({
        subtotal: math.subtotal,
        adminFee: math.adminFee,
        vat: math.vat,
        vatRate: rates.vatPct / 100,
        wht: math.wht,
        whtRate: rates.whtPct / 100,
        total: math.netDue,
      }),
    };
  });

  private readonly dialog = viewChild.required(FormDialog);

  constructor() {
    // Only opening the dialog, or a new preset lease, resets the form. The
    // reset fires the valueChanges handlers below, which read signals; run
    // untracked, those reads would become dependencies of this effect and the
    // next render would wipe a lease the user just picked.
    effect(() => {
      if (!this.visible()) return;
      const presetLeaseId = this.presetLeaseId();
      untracked(() => this.resetForOpen(presetLeaseId));
    });

    this.form.controls.leaseId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyLeaseDefaults();
        if (this.readingMode()) this.prefillFromLastReading();
      });
    this.form.controls.chargeItemId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((chargeItemId) => this.applyChargeItem(chargeItemId));
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.applyLeaseDefaults();
        if (!this.isUtilityType()) this.toggleReadingMode(false);
        else if (this.readingMode()) this.prefillFromLastReading();
      });
  }

  private resetForOpen(presetLeaseId: string | null): void {
    this.errors.reset();
    this.readingErrors.reset();
    this.errorMessage.set(null);
    this.saving.set(false);
    this.readingMode.set(false);
    this.form.controls.type.enable({ emitEvent: false });
    this.form.reset({
      leaseId: presetLeaseId ?? '',
      chargeItemId: '',
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
    if (!presetLeaseId) this.loadLeases();
    if (this.chargeItems().length === 0) this.loadChargeItems();
  }

  private loadChargeItems(): void {
    this.chargeItemsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (items) => this.chargeItems.set(items), error: () => this.chargeItems.set([]) });
  }

  /**
   * A bill picked from a charge item takes the item's type, so the type is locked while
   * one is picked. Unless staff typed an amount, the item's default amount replaces
   * whatever was filled in for them (such as the lease's rent).
   */
  private applyChargeItem(chargeItemId: string | null): void {
    const typeControl = this.form.controls.type;
    const item = chargeItemId ? this.chargeItems().find((candidate) => candidate.id === chargeItemId) : undefined;
    if (!item) {
      typeControl.enable({ emitEvent: false });
      return;
    }
    const amountControl = this.form.controls.amount;
    if (amountControl.pristine && amountControl.enabled) {
      amountControl.setValue(item.defaultAmount === null ? null : Number(item.defaultAmount));
    }
    // Setting the type runs the lease defaults, so a rent item with no default takes the lease's rent.
    typeControl.setValue(item.billType);
    typeControl.disable({ emitEvent: false });
  }

  toggleReadingMode(on: boolean): void {
    this.readingMode.set(on);
    const amountControl = this.form.controls.amount;
    if (on) {
      amountControl.disable();
      amountControl.setValue(null);
      this.prefillFromLastReading();
    } else {
      amountControl.enable();
      this.readingErrors.reset();
    }
  }

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

    const { leaseId, chargeItemId, type, amount, dueDate, notes } = this.form.getRawValue();
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
        taxBasis: reading.taxBasis,
        whtRate: (reading.whtPct ?? 0) / 100,
      };
    }
    if (payloadAmount === null) return;

    this.saving.set(true);
    this.bills
      .create(leaseId, {
        type,
        chargeItemId: chargeItemId || undefined,
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
            this.toggleReadingMode(false);
            this.form.controls.type.enable({ emitEvent: false });
            this.form.reset({ leaseId, chargeItemId: '', type, amount: null, dueDate: null, notes: '' });
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
    label: `Unit ${lease.unit.unitNo} · ${lease.unit.property.name} · ${lease.resident.firstName} ${lease.resident.lastName}`,
    monthlyRent: lease.monthlyRent,
    dueDay: lease.dueDay,
    billsElectricity: lease.billsElectricity,
    billsWater: lease.billsWater,
  };
}
