import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

/** Teaching empty state: says what will appear here and offers the primary action. */
@Component({
  selector: 'app-empty-state',
  imports: [PIcon],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 rounded-base border border-dashed border-border bg-background px-6 py-12 text-center">
      <div class="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-muted">
        <svg [pIcon]="icon()" [size]="18" aria-hidden="true"></svg>
      </div>
      <div class="flex flex-col gap-1">
        <h3 class="font-heading text-[15px] font-semibold text-heading">{{ heading() }}</h3>
        <p class="max-w-[42ch] text-[13px] leading-relaxed text-muted">{{ description() }}</p>
      </div>
      @if (ctaLabel(); as label) {
        <button
          type="button"
          class="mt-1 inline-flex h-9 items-center gap-2 rounded-base border-none bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 ease-out hover:bg-primary-hover active:bg-primary-active motion-reduce:transition-none"
          (click)="cta.emit()"
        >
          <svg pIcon="plus" [size]="14" aria-hidden="true"></svg>
          <span>{{ label }}</span>
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly ctaLabel = input<string | null>(null);
  readonly cta = output<void>();
}
