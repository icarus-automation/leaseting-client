import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../../core/models/api.types';
import type { ChargeItemResponse } from '../../../../../core/models/charge-item.types';
import { BILL_TYPE_OPTIONS, type BillType } from '../../../../../core/models/enums';
import { ChargeItemsService } from '../../../../settings/services/charge-items.service';
import { createChargeLineGroup, type ChargeLineArray, type ChargeLineGroup } from './charge-line-form';

interface ChargeOption {
  label: string;
  value: string;
  billType: BillType;
  defaultAmount: number | null;
}

/**
 * The editable list of rent charge lines behind the wizard's "Lease terms"
 * step. It reads the org catalogue, so whatever the user curates in
 * Settings → Charge items is what they can charge — and a charge invented
 * mid-onboarding is added to that catalogue rather than stranded on one lease.
 *
 * The parent owns the FormArray; this component only edits it.
 */
@Component({
  selector: 'app-charge-lines',
  imports: [ReactiveFormsModule, PIcon, InputNumber, Select],
  templateUrl: './charge-lines.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChargeLines {
  private readonly fb = inject(FormBuilder);
  private readonly chargeItems = inject(ChargeItemsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly lines = input.required<ChargeLineArray>();
  readonly busy = input(false);
  /** Wording for the add action, e.g. "Add another charge". */
  readonly addLabel = input('Add another charge');
  readonly emptyMessage = input('No charges yet.');

  readonly billTypeOptions = BILL_TYPE_OPTIONS;

  readonly catalog = signal<ChargeItemResponse[] | null>(null);
  readonly catalogError = signal<string | null>(null);

  readonly newItemMode = signal(false);
  readonly creatingItem = signal(false);
  readonly newItemError = signal<string | null>(null);

  readonly newItemForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    billType: ['OTHER' as BillType, [Validators.required]],
  });

  private readonly newItemInput = viewChild<ElementRef<HTMLInputElement>>('newItemInput');

  /**
   * Active catalogue items, plus any archived one a saved line still points at
   * — resuming an onboarding must not silently swap out a charge.
   */
  readonly options = computed<ChargeOption[]>(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    const chosen = new Set(
      this.lines()
        .controls.map((group) => group.controls.chargeItemId.value)
        .filter((id): id is string => id !== null),
    );
    return catalog
      .filter((item) => !item.isArchived || chosen.has(item.id))
      .map((item) => ({
        label: item.isArchived ? `${item.name} (archived)` : item.name,
        value: item.id,
        billType: item.billType,
        defaultAmount: item.defaultAmount === null ? null : Number(item.defaultAmount),
      }));
  });

  readonly loadingCatalog = computed(() => this.catalog() === null && this.catalogError() === null);

  constructor() {
    this.loadCatalog();

    // A line saved before its catalogue item was deleted, or translated from an
    // onboarding started under the old wizard, has a name but no id. Keep it
    // visible by giving the picker a matching entry rather than blanking it.
    effect(() => {
      const options = this.options();
      if (options.length === 0) return;
      untracked(() => this.adoptOrphanLines(options));
    });
  }

  loadCatalog(): void {
    this.catalog.set(null);
    this.catalogError.set(null);
    this.chargeItems
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.catalog.set(items),
        error: (error: unknown) =>
          this.catalogError.set(apiErrorMessage(error, 'Could not load the charge items.')),
      });
  }

  addLine(): void {
    this.lines().push(createChargeLineGroup());
  }

  removeLine(index: number): void {
    this.lines().removeAt(index);
  }

  /** Picking a charge stamps its name and bill type onto the line. */
  onChargePicked(group: ChargeLineGroup, chargeItemId: string): void {
    const option = this.options().find((candidate) => candidate.value === chargeItemId);
    if (!option) return;
    group.controls.name.setValue(option.label.replace(/ \(archived\)$/, ''));
    group.controls.billType.setValue(option.billType);
    if (group.controls.amount.value === null && option.defaultAmount !== null) {
      group.controls.amount.setValue(option.defaultAmount);
    }
  }

  openNewItem(): void {
    this.newItemForm.reset({ name: '', billType: 'OTHER' });
    this.newItemError.set(null);
    this.newItemMode.set(true);
    // The input mounts on the next change-detection pass.
    queueMicrotask(() => this.newItemInput()?.nativeElement.focus());
  }

  closeNewItem(): void {
    this.newItemMode.set(false);
    this.newItemError.set(null);
  }

  /** Adds to the org catalogue (so it shows in Settings too) and uses it here. */
  submitNewItem(): void {
    if (this.newItemForm.invalid) {
      this.newItemError.set('Use at least 2 characters.');
      return;
    }
    const { name, billType } = this.newItemForm.getRawValue();

    this.creatingItem.set(true);
    this.newItemError.set(null);
    this.chargeItems
      .create({ name: name.trim(), billType })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creatingItem.set(false);
          this.catalog.update((items) => [...(items ?? []), created]);
          this.closeNewItem();
          const group = createChargeLineGroup({ chargeItemId: created.id, name: created.name, billType: created.billType });
          this.lines().push(group);
        },
        error: (error: unknown) => {
          this.creatingItem.set(false);
          this.newItemError.set(apiErrorMessage(error, 'Could not add the charge item.'));
        },
      });
  }

  /** Re-links saved lines to the catalogue by name when the id is missing. */
  private adoptOrphanLines(options: ChargeOption[]): void {
    for (const group of this.lines().controls) {
      if (group.controls.chargeItemId.value) continue;
      const name = group.controls.name.value.trim().toLowerCase();
      if (!name) continue;
      const match = options.find((option) => option.label.toLowerCase() === name);
      if (match) group.controls.chargeItemId.setValue(match.value);
    }
  }
}
