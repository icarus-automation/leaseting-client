import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ReceiptScanResult, UtilityRunPreviewRow } from '../../../../core/models/bill.types';
import type { BillType } from '../../../../core/models/enums';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { PropertiesService } from '../../../properties/services/properties.service';
import { BillsService } from '../../services/bills.service';
import { computeRow, deriveRate, type UtilityRowMath } from './utility-run-math.util';

type UtilityType = Extract<BillType, 'ELECTRICITY' | 'WATER'>;
type RateMode = 'direct' | 'derived';

/** One lease's editable line in the run. */
interface RunRow extends UtilityRunPreviewRow {
  previous: number | null;
  present: number | null;
}

const UTILITY_TYPE_OPTIONS: { label: string; value: UtilityType }[] = [
  { label: 'Electricity (Meralco)', value: 'ELECTRICITY' },
  { label: 'Water (Maynilad)', value: 'WATER' },
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

@Component({
  selector: 'app-utility-run',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PIcon,
    DatePicker,
    InputNumber,
    Select,
    DatePipe,
    PhpCurrencyPipe,
    EmptyState,
    Skeleton,
  ],
  templateUrl: './utility-run.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilityRun {
  private readonly fb = inject(FormBuilder);
  private readonly bills = inject(BillsService);
  private readonly properties = inject(PropertiesService);
  private readonly router = inject(Router);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly typeOptions = UTILITY_TYPE_OPTIONS;

  readonly setupForm = this.fb.nonNullable.group({
    propertyId: ['', [Validators.required]],
    type: ['ELECTRICITY' as UtilityType, [Validators.required]],
    // Smart defaults: bill the current month, meter read up to today. The
    // period start is filled from the last cycle once the property is picked.
    billingMonth: [firstOfMonth(new Date()) as Date | null, [Validators.required]],
    periodFrom: [null as Date | null, [Validators.required]],
    periodTo: [startOfDay(new Date()) as Date | null, [Validators.required]],
  });
  readonly setupErrors = createFormErrors(this.setupForm);

  /** Billing month is clamped to last month → this month; no future, no old backlog. */
  readonly monthMin = firstOfMonth(addMonths(new Date(), -1));
  readonly monthMax = startOfDay(new Date());

  readonly rateForm = this.fb.nonNullable.group({
    ratePerUnit: [null as number | null],
    totalBillAmount: [null as number | null],
    totalConsumption: [null as number | null],
    adminFeePct: [0, [Validators.min(0), Validators.max(100)]],
    vatPct: [0, [Validators.min(0), Validators.max(100)]],
    whtPct: [0, [Validators.min(0), Validators.max(100)]],
  });

  // Most landlords get one provider bill and split it across sub-meters, so
  // "from total bill" is the default; staff switch to a fixed per-unit rate
  // (e.g. a known ₱/kWh) only when they have one.
  readonly rateMode = signal<RateMode>('derived');
  readonly propertyOptions = signal<PropertyListItem[]>([]);
  readonly rows = signal<RunRow[]>([]);
  readonly loadingRows = signal(false);
  readonly rowsError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly scanning = signal(false);
  /** Collapsed-by-default sections — the defaults are usually right. */
  readonly showDates = signal(false);
  readonly showTaxes = signal(false);

  private readonly scanInput = viewChild.required<ElementRef<HTMLInputElement>>('scanInput');

  private readonly setupValues = toSignal(this.setupForm.valueChanges, {
    initialValue: this.setupForm.getRawValue(),
  });
  private readonly rateValues = toSignal(this.rateForm.valueChanges, {
    initialValue: this.rateForm.getRawValue(),
  });

  /** The ₱/unit rate in force — typed directly or derived from the totals. */
  readonly effectiveRate = computed(() => {
    const values = this.rateValues();
    if (this.rateMode() === 'direct') {
      return values.ratePerUnit != null && values.ratePerUnit > 0 ? values.ratePerUnit : null;
    }
    if (values.totalBillAmount == null || values.totalConsumption == null) return null;
    return deriveRate(values.totalBillAmount, values.totalConsumption);
  });

  /** Per-row math aligned by index with rows(); null = incomplete/invalid row. */
  readonly rowMath = computed<(UtilityRowMath | null)[]>(() => {
    const rate = this.effectiveRate();
    const { adminFeePct, vatPct, whtPct } = this.rateValues();
    return this.rows().map((row) => {
      if (rate == null || row.previous == null || row.present == null) return null;
      return computeRow(row.previous, row.present, {
        ratePerUnit: rate,
        adminFeePct: adminFeePct ?? 0,
        vatPct: vatPct ?? 0,
        whtPct: whtPct ?? 0,
      });
    });
  });

  readonly filledCount = computed(() => this.rowMath().filter((math) => math !== null).length);

  readonly grandTotal = computed(() =>
    this.rowMath().reduce((sum, math) => sum + (math?.netDue ?? 0), 0),
  );

  readonly unitLabel = computed(() => (this.setupValues().type === 'WATER' ? 'cu.m' : 'kWh'));

  /** No carried readings at all — this property has never been billed for this
   *  utility, so staff seed each meter's current figure as the baseline. */
  readonly firstRun = computed(() => {
    const rows = this.rows();
    return rows.length > 0 && rows.every((row) => row.previous == null);
  });

  /** The auto-filled coverage window, for the collapsed "Billing period" summary. */
  readonly periodSummary = computed(() => {
    const { periodFrom, periodTo } = this.setupValues();
    return periodFrom ? { from: periodFrom, to: periodTo } : null;
  });

  constructor() {
    this.properties
      .list(1, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.propertyOptions.set(result.data));

    // A run is property+type scoped: whenever either changes, refetch the
    // leases and their carried-over readings.
    let lastKey = '';
    effect(() => {
      const { propertyId, type } = this.setupValues();
      const key = `${propertyId}:${type}`;
      if (!propertyId || !type || key === lastKey) return;
      lastKey = key;
      this.loadRows(propertyId, type);
    });
  }

  setRateMode(mode: RateMode): void {
    this.rateMode.set(mode);
  }

  updateRow(index: number, patch: Partial<Pick<RunRow, 'previous' | 'present'>>): void {
    this.rows.update((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  openScanPicker(): void {
    this.scanInput().nativeElement.click();
  }

  onScanFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.scanning()) return;

    this.scanning.set(true);
    this.bills
      .scanReceipt(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.scanning.set(false);
          this.applyScan(result);
        },
        error: (error: unknown) => {
          this.scanning.set(false);
          const status = (error as { status?: number }).status;
          this.toast.add(
            status === 501
              ? { severity: 'info', summary: 'Receipt scanning isn’t configured on the server' }
              : { severity: 'error', summary: 'Scan failed', detail: apiErrorMessage(error) },
          );
        },
      });
  }

  /** Prefills only untouched fields — staff-entered values always win. */
  private applyScan(scan: ReceiptScanResult): void {
    const filled: string[] = [];
    const setup = this.setupForm.controls;
    const rate = this.rateForm.controls;

    if (scan.provider && setup.type.pristine) {
      setup.type.setValue(scan.provider === 'maynilad' ? 'WATER' : 'ELECTRICITY');
      filled.push('utility type');
    }
    if (scan.ratePerKwh != null && rate.ratePerUnit.value == null) {
      this.setRateMode('direct');
      rate.ratePerUnit.setValue(scan.ratePerKwh);
      filled.push('rate');
    } else if (scan.totalAmountDue != null && scan.totalConsumption != null && rate.totalBillAmount.value == null) {
      this.setRateMode('derived');
      rate.totalBillAmount.setValue(scan.totalAmountDue);
      rate.totalConsumption.setValue(scan.totalConsumption);
      filled.push('total bill + consumption');
    }
    // Period dates carry sensible defaults, so a scan overrides them only while
    // staff haven't edited by hand — a manual value always wins.
    if (scan.billingPeriodFrom && setup.periodFrom.pristine) {
      setup.periodFrom.setValue(new Date(scan.billingPeriodFrom));
      filled.push('period start');
    }
    if (scan.billingPeriodTo && setup.periodTo.pristine) {
      setup.periodTo.setValue(new Date(scan.billingPeriodTo));
      filled.push('period end');
    }
    if (scan.billingPeriodFrom || scan.billingPeriodTo) this.showDates.set(true);

    this.toast.add(
      filled.length > 0
        ? { severity: 'success', summary: 'Scanned', detail: `Filled in: ${filled.join(', ')}. Verify before saving.` }
        : { severity: 'info', summary: 'Nothing to fill', detail: 'The photo had no readable fields the form still needed.' },
    );
  }

  onSubmit(): void {
    this.setupErrors.submitted.set(true);
    if (this.setupForm.invalid) {
      // Surface an error hidden inside the collapsed "Billing period" section.
      const { periodFrom, periodTo } = this.setupForm.controls;
      if (periodFrom.invalid || periodTo.invalid) this.showDates.set(true);
      this.setupForm.markAllAsTouched();
      return;
    }
    if (this.effectiveRate() == null) {
      this.toast.add({
        severity: 'warn',
        summary: 'Rate missing',
        detail:
          this.rateMode() === 'direct'
            ? 'Enter the rate per unit.'
            : 'Enter the provider bill total and its consumption.',
      });
      return;
    }

    const math = this.rowMath();
    const payloadRows = this.rows()
      .map((row, index) => ({ row, math: math[index] }))
      .filter((entry) => entry.math !== null)
      .map(({ row }) => ({
        leaseId: row.leaseId,
        previousReading: row.previous!,
        presentReading: row.present!,
      }));
    if (payloadRows.length === 0) {
      this.toast.add({
        severity: 'warn',
        summary: 'No readings entered',
        detail: 'Type at least one present reading — blank rows are skipped.',
      });
      return;
    }

    const { propertyId, type, billingMonth, periodFrom, periodTo } = this.setupForm.getRawValue();
    const rate = this.rateForm.getRawValue();
    const direct = this.rateMode() === 'direct';

    this.saving.set(true);
    this.bills
      .createUtilityRun({
        propertyId,
        type,
        billingMonth: formatDate(billingMonth!, 'yyyy-MM', 'en-US'),
        periodFrom: formatDate(periodFrom!, 'yyyy-MM-dd', 'en-US'),
        periodTo: formatDate(periodTo!, 'yyyy-MM-dd', 'en-US'),
        adminFeeRate: (rate.adminFeePct ?? 0) / 100,
        vatRate: (rate.vatPct ?? 0) / 100,
        whtRate: (rate.whtPct ?? 0) / 100,
        ...(direct
          ? { ratePerUnit: rate.ratePerUnit! }
          : { totalBillAmount: rate.totalBillAmount!, totalConsumption: rate.totalConsumption! }),
        rows: payloadRows,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.toast.add({
            severity: result.created > 0 ? 'success' : 'info',
            summary: `${result.created} bill${result.created === 1 ? '' : 's'} created`,
            detail:
              result.skipped.length > 0
                ? `Skipped ${result.skipped.map((skip) => `Unit ${skip.unitNo} (${skip.reason.toLowerCase()})`).join(', ')}`
                : undefined,
          });
          if (result.created > 0) void this.router.navigate(['/bills'], { queryParams: { type } });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not create the bills',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  private loadRows(propertyId: string, type: UtilityType): void {
    this.loadingRows.set(true);
    this.rowsError.set(null);
    this.rows.set([]);
    this.bills
      .utilityRunPreview(propertyId, type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (preview) => {
          this.loadingRows.set(false);
          this.rows.set(
            preview.map((row) => ({
              ...row,
              previous: row.previousReading != null ? Number(row.previousReading) : null,
              present: null,
            })),
          );
          this.applyPeriodDefaults(preview);
        },
        error: (error: unknown) => {
          this.loadingRows.set(false);
          this.rowsError.set(apiErrorMessage(error, 'Could not load the leases for this property.'));
        },
      });
  }

  /**
   * Fills the period start once, so staff rarely touch dates: continue from the
   * last cycle's end where there's history, else from the first of the month.
   */
  private applyPeriodDefaults(rows: UtilityRunPreviewRow[]): void {
    const fromControl = this.setupForm.controls.periodFrom;
    if (fromControl.value !== null) return;
    const latestPeriodTo = rows
      .map((row) => row.lastPeriodTo)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1);
    const month = this.setupForm.controls.billingMonth.value ?? new Date();
    fromControl.setValue(latestPeriodTo ? new Date(latestPeriodTo) : firstOfMonth(month));
  }
}
