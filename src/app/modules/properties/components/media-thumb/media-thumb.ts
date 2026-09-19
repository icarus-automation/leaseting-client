import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-media-thumb',
  template: `
    @if (src(); as url) {
      @if (failed()) {
        <ng-content />
      } @else {
        @if (!loaded()) {
          <div
            class="absolute inset-0 animate-pulse bg-surface motion-reduce:animate-none"
            aria-hidden="true"
          ></div>
        }
        <img
          [src]="url"
          [alt]="alt()"
          class="h-full w-full"
          [class.object-cover]="fit() === 'cover'"
          [class.object-contain]="fit() === 'contain'"
          [class.opacity-0]="!loaded()"
          loading="lazy"
          (load)="loaded.set(true)"
          (error)="failed.set(true)"
        />
      }
    } @else {
      <ng-content />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative flex h-full w-full items-center justify-center overflow-hidden',
  },
})
export class MediaThumb {
  readonly src = input<string | null>(null);
  readonly alt = input('');
  readonly fit = input<'cover' | 'contain'>('cover');

  readonly loaded = linkedSignal(() => {
    this.src();
    return false;
  });
  readonly failed = linkedSignal(() => {
    this.src();
    return false;
  });
}
