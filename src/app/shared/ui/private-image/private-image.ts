import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

/**
 * Loads a cookie-authenticated image (proofs, destination QR) as a blob URL.
 * Cross-origin `<img src>` would omit credentials and 401 the private stream.
 */
@Component({
  selector: 'app-private-image',
  imports: [PIcon],
  template: `
    @if (src(); as url) {
      <img
        [src]="url"
        [alt]="alt()"
        [class]="fit() === 'width' ? 'block h-auto w-full' : 'max-h-full max-w-full object-contain'"
      />
    } @else if (error(); as message) {
      @if (compact()) {
        <span class="sr-only">{{ message }}</span>
        <svg pIcon="image" class="text-muted" [size]="14" aria-hidden="true"></svg>
      } @else {
        <p class="text-[12.5px] text-destructive">{{ message }}</p>
      }
    } @else if (compact()) {
      <span class="sr-only">Loading image…</span>
    } @else {
      <span class="text-[12.5px] text-muted">Loading image…</span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateImage {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  readonly url = input.required<string>();
  readonly alt = input('');
  readonly fit = input<'contain' | 'width'>('contain');
  /** For thumbnails: no loading text, and an icon instead of the error sentence. */
  readonly compact = input(false);

  readonly src = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const url = this.url();
      this.src.set(null);
      this.error.set(null);
      if (!url) return;

      let objectUrl: string | null = null;
      this.http
        .get(url, { responseType: 'blob' })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            objectUrl = URL.createObjectURL(blob);
            this.src.set(objectUrl);
          },
          error: () => this.error.set('Could not load this image.'),
        });

      onCleanup(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      });
    });
  }
}
