import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, untracked } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import { createPlanBoardLoad } from '../../plan-board-load';

@Component({
  selector: 'app-plan-load-frame',
  imports: [PIcon],
  template: `
    @switch (status()) {
      @case ('loading') {
        <div class="absolute inset-0 z-10 flex items-center justify-center bg-white text-[13px] text-muted">
          Loading plan…
        </div>
      }
      @case ('error') {
        <div
          class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white px-4 text-center"
          role="alert"
        >
          <svg pIcon="exclamation-circle" class="text-destructive" [size]="20" aria-hidden="true"></svg>
          <p class="text-[13px] font-medium text-body">Couldn't load the floor plan.</p>
          <button
            type="button"
            class="inline-flex h-8 items-center rounded-base border border-border bg-background px-3 text-[13px] font-medium text-body transition-colors duration-150 ease-out hover:bg-surface motion-reduce:transition-none"
            (click)="retry()"
          >
            Retry
          </button>
        </div>
      }
      @case ('ready') {
        <img [src]="src()" alt="" class="block h-full w-full select-none" draggable="false" />
        <ng-content />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block h-full w-full' },
})
export class PlanLoadFrame {
  private readonly destroyRef = inject(DestroyRef);
  private readonly load = createPlanBoardLoad();

  readonly src = input.required<string>();
  readonly decoded = output<HTMLImageElement>();

  readonly status = this.load.status;

  constructor() {
    effect(() => {
      const url = this.src();
      untracked(() => this.load.start(url));
    });

    effect(() => {
      const image = this.load.image();
      if (this.load.status() === 'ready' && image) this.decoded.emit(image);
    });

    this.destroyRef.onDestroy(() => this.load.abort());
  }

  retry(): void {
    this.load.retry();
  }
}
