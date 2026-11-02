import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Select } from 'primeng/select';
import { ProgressSpinner } from 'primeng/progressspinner';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { OwnershipResponse, ResaleResult, ResaleWarning } from '../../../../core/models/ownership.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { UtilityBillingFields, utilityBillingGroup } from '../../../../shared/ui/utility-billing-fields/utility-billing-fields';
import { OwnershipsService } from '../../../ownerships/services/ownerships.service';
import { ResidentsService } from '../../../residents/services/residents.service';

interface ResidentOption {
  id: string;
  label: string;
}

function todayInput(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

@Component({
  selector: 'app-sell-unit-dialog',
  imports: [ReactiveFormsModule, Select, ProgressSpinner, ErrorBanner, FormDialog, UtilityBillingFields],
  templateUrl: './sell-unit-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellUnitDialog {
  private readonly fb = inject(FormBuilder);
  private readonly ownerships = inject(OwnershipsService);
  private readonly residents = inject(ResidentsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly unitId = input.required<string>();
  readonly intent = input.required<'sell' | 'resale'>();
  readonly billsElectricityByDefault = input(true);
  readonly billsWaterByDefault = input(true);
  readonly saved = output<ResaleWarning | null>();

  readonly form = this.fb.nonNullable.group({
    residentId: ['', Validators.required],
    date: [todayInput(), Validators.required],
    price: [null as number | null],
    note: [''],
    utilities: utilityBillingGroup(),
  });
  readonly errors = createFormErrors(this.form);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly residentsError = signal<string | null>(null);
  readonly residentOptions = signal<ResidentOption[]>([]);

  readonly heading = () => (this.intent() === 'resale' ? 'Resell unit' : 'Sell unit');

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      this.errors.reset();
      this.errorMessage.set(null);
      this.saving.set(false);
      this.form.reset({
        residentId: '',
        date: todayInput(),
        price: null,
        note: '',
        utilities: {
          billsElectricity: this.billsElectricityByDefault(),
          billsWater: this.billsWaterByDefault(),
        },
      });
      this.loadResidents('');
    });
  }

  loadResidents(query: string): void {
    this.residentsError.set(null);
    this.residents
      .list({ q: query, limit: 50, scope: 'active' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) =>
          this.residentOptions.set(
            page.data.map((resident) => ({
              id: resident.id,
              label: `${resident.firstName} ${resident.lastName}`,
            })),
          ),
        error: (error: unknown) =>
          this.residentsError.set(apiErrorMessage(error, 'Could not load residents.')),
      });
  }

  onResidentFilter(event: { filter?: string }): void {
    this.loadResidents(event.filter?.trim() ?? '');
  }

  onSubmit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { utilities, price, note, residentId, date } = this.form.getRawValue();
    const shared = {
      residentId,
      ...(price === null ? {} : { price }),
      ...(note.trim() ? { note: note.trim() } : {}),
      billsElectricity: utilities.billsElectricity,
      billsWater: utilities.billsWater,
    };
    const request$: Observable<OwnershipResponse | ResaleResult> =
      this.intent() === 'resale'
        ? this.ownerships.resell(this.unitId(), { ...shared, transferDate: date })
        : this.ownerships.sell(this.unitId(), { ...shared, startDate: date });

    this.saving.set(true);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit('warning' in result ? result.warning : null);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(apiErrorMessage(error, 'Could not save the sale.'));
      },
    });
  }
}
