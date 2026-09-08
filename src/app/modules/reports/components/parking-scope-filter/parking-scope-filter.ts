import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';

import { DATE_RANGE_PRESETS, DateRangePreset, resolvePreset } from '../../date-range.util';
import { ParkingReportScope } from '../../parking-report.util';
import { ReportFiltersService } from '../../services/report-filters.service';

/**
 * The filter bar the three gate-cash reports share: a period, a property, and
 * a gate.
 *
 * One component rather than the same five controls pasted into three pages,
 * because these reports are meant to be read against each other. A variance on
 * a till is explained by the exits on it and the voids taken off it, and that
 * cross-check only holds if "September, Basement Gate" means the same thing on
 * every page.
 *
 * The host is `display: contents` so the fields drop into whatever grid the
 * report lays out.
 */
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
      <label class="text-[13px] font-medium text-heading" [attr.for]="id('terminal')">Gate</label>
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
  /** Prefix for the field ids, so one page can host more than one bar. */
  readonly idPrefix = input('parking-report');
  readonly valueChange = output<ParkingReportScope>();

  readonly presets = DATE_RANGE_PRESETS;
  /** A gate cannot have taken money on a day that has not happened. */
  readonly today = new Date();

  readonly propertyOptions = this.filters.propertyOptions;

  /**
   * Gates are listed across every property rather than filtered to the one
   * picked. Narrowing the list would silently drop the gate already selected
   * whenever the property above it changes, and the server intersects the two
   * filters anyway: a gate elsewhere returns an empty report, which is the
   * honest answer to what was asked.
   */
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
    // "Custom" only arms the two date fields; the window showing stays put
    // until one of them is actually edited.
    this.emit(range ? { preset, range } : { preset });
  }

  /** Editing either end by hand is what "custom" means, so no second click. */
  onFromChange(from: Date): void {
    this.emit({ preset: 'custom', range: { ...this.value().range, from } });
  }

  onToChange(to: Date): void {
    this.emit({ preset: 'custom', range: { ...this.value().range, to } });
  }

  onTerminalChange(terminalId: string): void {
    this.emit({ terminalId });
  }

  /**
   * Changing the property clears the gate below it. Leaving a gate from another
   * property selected would intersect to an empty report, and an empty page is
   * the one result a reader cannot tell from a broken one.
   */
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
