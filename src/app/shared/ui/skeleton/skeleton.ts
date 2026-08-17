import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

/** Loading placeholder blocks. Purely decorative — hidden from AT. */
@Component({
  selector: 'app-skeleton',
  template: `
    <div class="animate-pulse motion-reduce:animate-none" aria-hidden="true">
      @switch (variant()) {
        @case ('card') {
          <div class="overflow-hidden rounded-base border border-border bg-background">
            <div class="h-36 bg-surface"></div>
            <div class="flex flex-col gap-2 p-3.5">
              <div class="h-3.5 w-2/3 rounded-[2px] bg-surface"></div>
              <div class="h-3 w-1/2 rounded-[2px] bg-surface"></div>
              <div class="mt-1 flex gap-1.5">
                <div class="h-5 w-14 rounded-full bg-surface"></div>
                <div class="h-5 w-14 rounded-full bg-surface"></div>
                <div class="h-5 w-14 rounded-full bg-surface"></div>
              </div>
            </div>
          </div>
        }
        @case ('row') {
          <div class="flex items-center gap-4 border-b border-border px-4 py-3">
            <div class="h-3.5 w-1/4 rounded-[2px] bg-surface"></div>
            <div class="h-3.5 w-1/5 rounded-[2px] bg-surface"></div>
            <div class="h-3.5 w-1/6 rounded-[2px] bg-surface"></div>
            <div class="ml-auto h-3.5 w-16 rounded-[2px] bg-surface"></div>
          </div>
        }
        @case ('panel') {
          <div class="flex flex-col gap-3 rounded-base border border-border bg-background p-4">
            <div class="h-4 w-1/2 rounded-[2px] bg-surface"></div>
            @for (line of lines(); track $index) {
              <div class="h-3 rounded-[2px] bg-surface" [style.width.%]="line"></div>
            }
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Skeleton {
  readonly variant = input<'card' | 'row' | 'panel'>('row');
  /** Pseudo-random but stable line widths for the panel variant. */
  readonly lines = computed(() => [90, 65, 78, 50, 82, 60].slice(0, 6));
}
