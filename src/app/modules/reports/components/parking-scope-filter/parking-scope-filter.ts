import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';

import { DATE_RANGE_PRESETS, DateRangePreset, resolvePreset } from '../../date-range.util';
import { ParkingReportScope } from '../../parking-report.util';
import { ReportFiltersService } from '../../services/report-filters.service';

@Component({
  selector: 'app-parking-scope-filter',
  imports: [FormsModule, Select, DatePicker],
  host: { class: 'contents' },
  template: `
    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-heading" [attr.for]="id('period')">Period</label>
      <p-select
        [inputId]="id('period')"
        [options]="presets"
        optionLabel="label"
        optionValue="value"
        [ngModel]="value().preset"
        (ngModelChange)="onPresetChange($event)"
        styleClass="w-full"
        appendTo="body"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-heading" [attr.for]="id('from')">From</label>
      <p-datepicker
        [inputId]="id('from')"
        [ngModel]="value().range.from"
        (ngModelChange)="onFromChange($event)"
        dateFormat="d M yy"
        [maxDate]="today"
        [showIcon]="true"
        appendTo="body"
        styleClass="w-full"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-heading" [attr.for]="id('to')">To</label>
      <p-datepicker
        [inputId]="id('to')"
        [ngModel]="value().range.to"
        (ngModelChange)="onToChange($event)"
        dateFormat="d M yy"
        [maxDate]="today"
        [showIcon]="true"
        appendTo="body"
        styleClass="w-full"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-heading" [attr.for]="id('property')">Property</label>
      <p-select
        [inputId]="id('property')"
        [options]="propertyOptions()"
        optionLabel="label"
        optionValue="value"
        [ngModel]="value().propertyId"
        (ngModelChange)="onPropertyChange($event)"
        styleClass="w-full"
        appendTo="body"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-[13px] font-medium text-heading" [attr.for]="id('terminal')">Terminal</label>
      <p-select
        [inputId]="id('terminal')"
        [options]="terminalOptions()"
        optionLabel="label"
        optionValue="value"
        [ngModel]="value().terminalId"
        (ngModelChange)="onTerminalChange($event)"
        styleClass="w-full"
        appendTo="body"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingScopeFilter {
  private readonly filters = inject(ReportFiltersService);

  readonly value = input.required<ParkingReportScope>();
  readonly idPrefix = input('parking-report');
  readonly valueChange = output<ParkingReportScope>();

  readonly presets = DATE_RANGE_PRESETS;
  readonly today = new Date();

  readonly propertyOptions = this.filters.propertyOptions;

  readonly terminalOptions = this.filters.terminalOptions;

  constructor() {
    this.filters.ensureProperties();
    this.filters.ensureTerminals();
  }

  id(field: string): string {
    return `${this.idPrefix()}-${field}`;
  }

  onPresetChange(preset: DateRangePreset): void {
    const range = resolvePreset(preset, this.today);
    this.emit(range ? { preset, range } : { preset });
  }

  onFromChange(from: Date): void {
    this.emit({ preset: 'custom', range: { ...this.value().range, from } });
  }

  onToChange(to: Date): void {
    this.emit({ preset: 'custom', range: { ...this.value().range, to } });
  }

  onTerminalChange(terminalId: string): void {
    this.emit({ terminalId });
  }

  onPropertyChange(propertyId: string): void {
    const terminal = this.terminalOptions().find(
      (option) => option.value === this.value().terminalId,
    );
    const keepTerminal = !propertyId || !terminal || terminal.propertyId === propertyId;
    this.emit({ propertyId, ...(keepTerminal ? {} : { terminalId: '' }) });
  }

  private emit(patch: Partial<ParkingReportScope>): void {
    this.valueChange.emit({ ...this.value(), ...patch });
  }
}
