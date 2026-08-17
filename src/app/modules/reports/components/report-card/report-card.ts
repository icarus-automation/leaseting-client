import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { ReportEntry, isAvailable } from '../../report-catalog';

/**
 * One report in the catalog.
 *
 * The card is a plain container with a stretched title link rather than a
 * wrapping anchor, so the favorite button can live inside it without nesting
 * one interactive element in another. Unbuilt reports keep the same shape but
 * lose the link — the layout never shifts as reports ship.
 */
@Component({
  selector: 'app-report-card',
  imports: [RouterLink, PIcon],
  template: `
    <div
      class="group relative flex h-full flex-col gap-2 rounded-base border bg-background p-5 transition-colors duration-150 ease-out motion-reduce:transition-none"
      [class]="available()
        ? 'border-border hover:border-primary hover:bg-surface'
        : 'border-dashed border-border'"
    >
      <div class="flex items-start justify-between gap-2">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-base border border-border bg-surface"
          [class]="available() ? 'text-primary' : 'text-muted'"
        >
          <svg [pIcon]="entry().icon" [size]="16" aria-hidden="true"></svg>
        </span>

        <button
          type="button"
          class="relative z-10 flex h-7 w-7 items-center justify-center rounded-base text-muted transition-colors duration-150 ease-out hover:bg-surface hover:text-warning motion-reduce:transition-none"
          [class.text-warning]="favorite()"
          [attr.aria-pressed]="favorite()"
          [attr.aria-label]="favorite() ? 'Remove ' + entry().title + ' from favorites' : 'Add ' + entry().title + ' to favorites'"
          (click)="favoriteToggled.emit()"
        >
          <svg [pIcon]="favorite() ? 'star-fill' : 'star'" [size]="14" aria-hidden="true"></svg>
        </button>
      </div>

      <h3 class="font-heading text-[15px] font-semibold leading-snug text-heading">
        @if (entry().route; as route) {
          <a
            [routerLink]="route"
            class="rounded-[2px] transition-colors duration-150 ease-out after:absolute after:inset-0 after:content-[''] group-hover:text-primary motion-reduce:transition-none"
          >
            {{ entry().title }}
          </a>
        } @else {
          {{ entry().title }}
        }
      </h3>

      <p class="text-[13px] leading-relaxed text-body">{{ entry().summary }}</p>

      <div class="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3 text-[12.5px] font-medium">
        @if (available()) {
          <span class="text-primary">Open report</span>
          <svg
            pIcon="arrow-right"
            class="text-primary transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
            [size]="12"
            aria-hidden="true"
          ></svg>
        } @else {
          <span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2 py-[3px] text-[11.5px] text-muted">
            <svg pIcon="clock" [size]="11" aria-hidden="true"></svg>
            <span>Soon</span>
          </span>
          @if (entry().blockedBy; as blocker) {
            <span class="font-normal text-muted">Needs {{ blocker }}</span>
          }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportCard {
  readonly entry = input.required<ReportEntry>();
  readonly favorite = input(false);
  readonly favoriteToggled = output<void>();

  readonly available = computed(() => isAvailable(this.entry()));
}
