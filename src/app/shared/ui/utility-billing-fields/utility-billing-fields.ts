import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import type { LeaseUtilityBilling } from '../../../core/models/lease.types';

export type UtilityBillingGroup = FormGroup<{
  billsElectricity: FormControl<boolean>;
  billsWater: FormControl<boolean>;
}>;

/** A form group for whether Leaseting bills electricity and water. Both start billed. */
export function utilityBillingGroup(
  value: LeaseUtilityBilling = { billsElectricity: true, billsWater: true },
): UtilityBillingGroup {
  return new FormGroup({
    billsElectricity: new FormControl(value.billsElectricity, { nonNullable: true }),
    billsWater: new FormControl(value.billsWater, { nonNullable: true }),
  });
}

const OPTIONS = [
  { key: 'billsElectricity', label: 'Electricity', hint: 'Listed in the electricity run' },
  { key: 'billsWater', label: 'Water', hint: 'Listed in the water run' },
] as const;

/** Two checkboxes: whether Leaseting bills electricity, and water. Checked means billed. */
@Component({
  selector: 'app-utility-billing-fields',
  imports: [ReactiveFormsModule],
  template: `
    <fieldset class="m-0 min-w-0 border-0 p-0" [formGroup]="group()" [attr.aria-describedby]="description() ? idPrefix() + '-hint' : null">
      <legend class="p-0 text-[13px] font-medium text-heading">{{ legend() }}</legend>
      @if (description(); as text) {
        <p class="mt-0.5 text-[12px] text-muted" [id]="idPrefix() + '-hint'">{{ text }}</p>
      }
      <div class="mt-2 grid gap-2 sm:grid-cols-2">
        @for (option of options; track option.key) {
          <label
            class="flex cursor-pointer items-start gap-2.5 rounded-base border border-border bg-background px-3.5 py-3 transition-colors duration-150 ease-out hover:bg-surface has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring motion-reduce:transition-none"
            [for]="idPrefix() + '-' + option.key"
          >
            <input
              type="checkbox"
              class="mt-0.5 accent-primary"
              [id]="idPrefix() + '-' + option.key"
              [formControlName]="option.key"
            />
            <span class="flex flex-col">
              <span class="text-[13.5px] font-medium text-heading">{{ option.label }}</span>
              <span class="text-[12px] text-muted">{{ option.hint }}</span>
            </span>
          </label>
        }
      </div>
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilityBillingFields {
  readonly group = input.required<UtilityBillingGroup>();
  /** Prefix for the checkbox ids, unique on the page. */
  readonly idPrefix = input.required<string>();
  readonly legend = input.required<string>();
  readonly description = input<string | null>(null);

  readonly options = OPTIONS;
}
