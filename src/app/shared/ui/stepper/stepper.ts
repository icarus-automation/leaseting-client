import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

export interface StepperStep {
  key: string;
  label: string;
  status: 'done' | 'current' | 'upcoming';
  /** Only visited steps navigate — upcoming ones stay inert. */
  clickable: boolean;
}

/**
 * Wizard progress rail: vertical on md+ (left column layouts), compact
 * horizontal dots below. Done = filled check, current = ringed number,
 * upcoming = muted number.
 */
@Component({
  selector: 'app-stepper',
  imports: [PIcon],
  template: `
    <ol class="hidden flex-col md:flex" aria-label="Progress">
      @for (step of steps(); track step.key; let index = $index, last = $last) {
        <li class="relative flex gap-3 pb-0.5">
          @if (!last) {
            <span
              class="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px"
              [class]="step.status === 'done' ? 'bg-primary' : 'bg-border'"
              aria-hidden="true"
            ></span>
          }
          <button
            type="button"
            class="group flex items-start gap-3 rounded-base pb-5 text-left"
            [class.cursor-default]="!step.clickable"
            [disabled]="!step.clickable"
            [attr.aria-current]="step.status === 'current' ? 'step' : null"
            (click)="stepClick.emit(step.key)"
          >
            <span
              class="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors duration-150 ease-out motion-reduce:transition-none"
              [class]="
                step.status === 'done'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : step.status === 'current'
                    ? 'border-primary bg-background text-primary ring-[3px] ring-ring'
                    : 'border-border bg-background text-muted'
              "
            >
              @if (step.status === 'done') {
                <svg pIcon="check" [size]="12" aria-hidden="true"></svg>
              } @else {
                {{ index + 1 }}
              }
            </span>
            <span class="flex flex-col pt-1">
              <span
                class="text-[13px] font-medium leading-tight"
                [class]="step.status === 'current' ? 'text-heading' : step.status === 'done' ? 'text-body group-hover:text-heading' : 'text-muted'"
              >
                {{ step.label }}
              </span>
              @if (step.status === 'done') {
                <span class="text-[11.5px] text-muted">Completed</span>
              }
            </span>
          </button>
        </li>
      }
    </ol>

    <!-- Compact horizontal variant for small screens. -->
    <ol class="flex items-center gap-1.5 md:hidden" aria-label="Progress">
      @for (step of steps(); track step.key; let index = $index) {
        <li class="flex flex-1 flex-col items-stretch gap-1">
          <button
            type="button"
            class="h-1.5 w-full rounded-full transition-colors duration-150 ease-out motion-reduce:transition-none"
            [class]="step.status === 'done' ? 'bg-primary' : step.status === 'current' ? 'bg-primary/50' : 'bg-border'"
            [disabled]="!step.clickable"
            [attr.aria-label]="index + 1 + '. ' + step.label"
            [attr.aria-current]="step.status === 'current' ? 'step' : null"
            (click)="stepClick.emit(step.key)"
          ></button>
        </li>
      }
    </ol>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stepper {
  readonly steps = input.required<StepperStep[]>();
  readonly stepClick = output<string>();
}
