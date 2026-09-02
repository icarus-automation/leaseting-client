import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentedOption<T> {
  value: T;
  label: string;
}

/**
 * A row of mutually exclusive choices, styled as one control.
 *
 * Height is fixed at 2.5rem so it lines up with the app's inputs and with the
 * PrimeNG selects normalised to the same height in styles.css. Filter rows mix
 * this control with a dropdown constantly, and a segmented control sized only
 * by its own padding lands a few pixels short of one, which reads as a
 * misaligned toolbar on every page that has both.
 */
@Component({
  selector: 'app-segmented-control',
  template: `
    <div
      class="inline-flex h-10 items-center gap-1 rounded-base border border-border bg-surface p-1"
      role="group"
      [attr.aria-label]="ariaLabel()"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="h-full rounded-[3px] px-2.5 text-[12.5px] font-medium transition-colors duration-150 ease-out motion-reduce:transition-none"
          [class]="value() === option.value ? 'bg-primary text-primary-foreground' : 'text-body hover:bg-background'"
          [attr.aria-pressed]="value() === option.value"
          (click)="valueChange.emit(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl<T> {
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly value = input.required<T>();
  readonly ariaLabel = input.required<string>();
  readonly valueChange = output<T>();
}
