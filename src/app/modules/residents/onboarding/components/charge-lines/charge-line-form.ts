import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

import {
  CHARGE_FREQUENCY_LABELS,
  type ChargeFrequency,
  type ChargeItemResponse,
  type ChargeLine,
} from '../../../../../core/models/charge-item.types';
import type { BillType } from '../../../../../core/models/enums';

export type ChargeLineGroup = FormGroup<{
  chargeItemId: FormControl<string | null>;
  name: FormControl<string>;
  billType: FormControl<BillType>;
  description: FormControl<string>;
  amount: FormControl<number | null>;
}>;

export type ChargeLineArray = FormArray<ChargeLineGroup>;

export function createChargeLineGroup(line?: Partial<ChargeLine>): ChargeLineGroup {
  return new FormGroup({
    chargeItemId: new FormControl<string | null>(line?.chargeItemId ?? null),
    name: new FormControl(line?.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    billType: new FormControl<BillType>(line?.billType ?? 'OTHER', { nonNullable: true }),
    description: new FormControl(line?.description ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(120)],
    }),
    amount: new FormControl<number | null>(line?.amount ?? null, [Validators.required, Validators.min(0)]),
  });
}

export function createChargeLineArray(lines: Partial<ChargeLine>[]): ChargeLineArray {
  return new FormArray(lines.map((line) => createChargeLineGroup(line)));
}

export function toChargeLines(array: ChargeLineArray): ChargeLine[] {
  return array.controls.map((group) => {
    const { chargeItemId, name, billType, description, amount } = group.getRawValue();
    return {
      ...(chargeItemId ? { chargeItemId } : {}),
      name: name.trim(),
      billType,
      ...(description.trim() ? { description: description.trim() } : {}),
      amount: amount ?? 0,
    };
  });
}

export function chargeLinesTotal(array: ChargeLineArray): number {
  return array.controls.reduce((total, group) => total + (group.controls.amount.value ?? 0), 0);
}

export interface ChargeOption {
  label: string;
  name: string;
  value: string;
  billType: BillType;
  defaultAmount: number | null;
}

/**
 * The items a line can use: live items of the frequency the list bills. Lease terms are
 * billed every month, so they take monthly items; move-in charges are billed once, so
 * they take one-time items. System items are never offered. A line saved before its item
 * changed keeps showing it, marked, so the line can be swapped out; the API refuses it.
 */
export function chargeOptions(
  catalog: ChargeItemResponse[],
  chosenIds: ReadonlySet<string>,
  frequency: ChargeFrequency = 'MONTHLY',
): ChargeOption[] {
  return catalog
    .filter((item) => isOffered(item, frequency) || chosenIds.has(item.id))
    .map((item) => ({
      label: optionLabel(item, frequency),
      name: item.name,
      value: item.id,
      billType: item.billType,
      defaultAmount: item.defaultAmount === null ? null : Number(item.defaultAmount),
    }));
}

function isOffered(item: ChargeItemResponse, frequency: ChargeFrequency): boolean {
  return !item.isArchived && !item.isSystem && item.frequency === frequency;
}

function optionLabel(item: ChargeItemResponse, frequency: ChargeFrequency): string {
  if (item.isSystem) return `${item.name} (system)`;
  if (item.frequency !== frequency) return `${item.name} (${CHARGE_FREQUENCY_LABELS[item.frequency].toLowerCase()})`;
  if (item.isArchived) return `${item.name} (archived)`;
  return item.name;
}
