import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import type { Subscription } from 'rxjs';

import { MaintenanceRequestsService } from '../../services/maintenance-requests.service';

interface PhotoSlot {
  /** Object URL once the photo has loaded. */
  src: string | null;
  failed: boolean;
}

/**
 * A request's photos, up to three: one large view, plus thumbnails to switch
 * it when there is more than one.
 *
 * The photos are private and served no-store, so each one is fetched once with
 * the session cookie and held as an object URL while the request is on screen.
 * The large view and its thumbnail share that URL instead of downloading the
 * same file twice.
 */
@Component({
  selector: 'app-request-photos',
  imports: [PIcon],
  host: { class: 'flex flex-col gap-2' },
  template: `
    @if (selectedSlot(); as slot) {
      <div class="flex h-72 items-center justify-center overflow-hidden rounded-base border border-border bg-surface p-2">
        @if (slot.src; as src) {
          <img [src]="src" [alt]="altText()" class="max-h-full max-w-full object-contain" />
        } @else if (slot.failed) {
          <p class="text-[12.5px] text-destructive">Could not load this photo.</p>
        } @else {
          <span class="text-[12.5px] text-muted">Loading photo…</span>
        }
      </div>
    }

    <div class="flex flex-wrap items-center gap-2">
      @if (slots().length > 1) {
        <div class="flex gap-2" role="group" aria-label="Choose a photo">
          @for (slot of slots(); track $index) {
            <button
              type="button"
              class="flex h-14 w-14 items-center justify-center overflow-hidden rounded-base border bg-surface transition-colors duration-150 ease-out motion-reduce:transition-none"
              [class]="$index === selected() ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary'"
              [attr.aria-label]="'Photo ' + ($index + 1) + ' of ' + slots().length"
              [attr.aria-pressed]="$index === selected()"
              (click)="selected.set($index)"
            >
              @if (slot.src; as src) {
                <img [src]="src" alt="" class="h-full w-full object-cover" />
              } @else if (slot.failed) {
                <svg pIcon="exclamation-circle" class="text-destructive" [size]="14" aria-hidden="true"></svg>
              } @else {
                <svg pIcon="image" class="text-muted" [size]="14" aria-hidden="true"></svg>
              }
            </button>
          }
        </div>
      }
      @if (selectedSlot()?.src; as src) {
        <a
          [href]="src"
          target="_blank"
          rel="noopener"
          class="ml-auto inline-flex items-center gap-1 rounded-[2px] text-[12.5px] font-medium text-primary hover:underline"
        >
          <span>Open full size</span>
          <span class="sr-only">, opens in a new tab</span>
          <svg pIcon="external-link" [size]="11" aria-hidden="true"></svg>
        </a>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestPhotos {
  private readonly requests = inject(MaintenanceRequestsService);

  readonly urls = input.required<string[]>();
  /** The request title, for alt text. */
  readonly title = input.required<string>();

  readonly slots = signal<PhotoSlot[]>([]);
  readonly selected = signal(0);
  readonly selectedSlot = computed<PhotoSlot | null>(() => this.slots()[this.selected()] ?? null);
  readonly altText = computed(
    () => `${this.title()}, photo ${this.selected() + 1} of ${this.slots().length}`,
  );

  /** A re-read request hands over a new array with the same URLs, which is no reason to download again. */
  private readonly photoUrls = computed(() => this.urls(), { equal: sameUrls });

  constructor() {
    effect((onCleanup) => {
      const urls = this.photoUrls();
      const objectUrls: string[] = [];
      this.selected.set(0);
      this.slots.set(urls.map(() => ({ src: null, failed: false })));

      const subscriptions: Subscription[] = urls.map((url, index) =>
        this.requests.photo(url).subscribe({
          next: (blob) => {
            const objectUrl = URL.createObjectURL(blob);
            objectUrls.push(objectUrl);
            this.patch(index, { src: objectUrl, failed: false });
          },
          error: () => this.patch(index, { src: null, failed: true }),
        }),
      );

      onCleanup(() => {
        for (const subscription of subscriptions) subscription.unsubscribe();
        for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
      });
    });
  }

  private patch(index: number, slot: PhotoSlot): void {
    this.slots.update((slots) => slots.map((current, i) => (i === index ? slot : current)));
  }
}

function sameUrls(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((url, index) => url === b[index]);
}
