import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';

import { AS_OF_PRESETS, AsOfPreset, resolveAsOf } from '../../as-of.util';

/**
 * The "as of" control shared by the point-in-time reports: a preset list and
 * the date it resolves to, kept in step.
 *
 * The host is `display: contents` so both fields drop straight into whatever
 * grid the report lays out, rather than forcing every page to wrap them in a
 * column of their own.
 */
@Component({
  selector: 'app-as-of-filter',
  imports: [FormsModule, Select, DatePicker],
  host: { class: 'contents' },
  template: `
    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-heading" [attr.for]="presetId()">Report date</label>
      <p-select
        [inputId]="presetId()"
        [options]="presets"
        optionLabel="label"
        optionValue="value"
        [ngModel]="preset()"
        (ngModelChange)="onPresetChange($event)"
        styleClass="w-full"
        appendTo="body"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-heading" [attr.for]="dateId()">As of</label>
      <p-datepicker
        [inputId]="dateId()"
        [ngModel]="value()"
        (ngModelChange)="onDateChange($event)"
        dateFormat="d M yy"
        [maxDate]="today"
        [showIcon]="true"
        appendTo="body"
        styleClass="w-full"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsOfFilter {
  readonly value = input.required<Date>();
  /** Prefix for the two field ids, so one page can host more than one. */
  readonly idPrefix = input('report');
  readonly valueChange = output<Date>();

  readonly presets = AS_OF_PRESETS;
  readonly preset = signal<AsOfPreset>('today');
  /** A report cannot be run as of a date that has not happened. */
  readonly today = new Date();

  readonly presetId = computed(() => `${this.idPrefix()}-as-of-preset`);
  readonly dateId = computed(() => `${this.idPrefix()}-as-of-date`);

  onPresetChange(preset: AsOfPreset): void {
    this.preset.set(preset);
    const resolved = resolveAsOf(preset, this.today);
    if (resolved) this.valueChange.emit(resolved);
  }

  /** Picking a date by hand is what "custom" means — no second click needed. */
  onDateChange(date: Date): void {
    this.preset.set('custom');
    this.valueChange.emit(date);
  }
}
