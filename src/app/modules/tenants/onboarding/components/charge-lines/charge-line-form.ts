import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';

import type { ChargeLine } from '../../../../../core/models/charge-item.types';
import type { BillType } from '../../../../../core/models/enums';

/**
 * One money line on a lease, as a form group. `name` and `billType` are held
 * alongside the catalogue id on purpose: they are snapshotted onto the lease so
 * renaming or archiving the catalogue item later never rewrites a lease that
 * already went out.
 */
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

/** The payload shape the onboarding step DTOs expect. */
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
