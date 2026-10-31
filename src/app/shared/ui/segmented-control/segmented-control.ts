import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentedOption<T> {
  value: T;
  label: string;
}

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
          class="h-full rounded-[3px] px-2.5 text-[12.5px] font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed motion-reduce:transition-none"
          [class]="value() === option.value ? 'bg-primary text-primary-foreground' : 'text-body enabled:hover:bg-background disabled:text-muted'"
          [attr.aria-pressed]="value() === option.value"
          [disabled]="disabled()"
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
  /** Shows the choice without letting it change, e.g. for a role that can only view. */
  readonly disabled = input(false);
  readonly valueChange = output<T>();
}
