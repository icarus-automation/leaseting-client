import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector,
  afterNextRender, computed, effect, inject, input, output,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import type { CalendarEntry } from '../../../../core/models/calendar.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TONE_FILLS, entrySource, entryTone } from '../../calendar-state';
import { placePopover, relativeDay } from './popover-placement';

/** Below this width the card is a sheet along the bottom of the screen. */
const SHEET_QUERY = '(max-width: 639px)';

let nextId = 0;

/**
 * An entry's details in a card beside it, after Google Calendar's event card:
 * the status color and title, the date, then the tenant, unit and money as
 * icon rows, with the status and the way to the source along the bottom.
 * It closes on Escape, a click outside, or focus leaving it.
 */
@Component({
  selector: 'app-entry-popover',
  imports: [DatePipe, RouterLink, PIcon, PhpCurrencyPipe, StatusBadge],
  templateUrl: './entry-popover.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'dialog',
    tabindex: '-1',
    // Hidden until placed, so it never shows a frame in the wrong spot.
    style: 'visibility: hidden',
    class:
      'fixed z-(--z-overlay) flex w-[25rem] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden ' +
      // Focus lands on the card itself, which is not a control: no ring there, only on what Tab reaches next.
      'rounded-base border border-border bg-background text-body shadow-modal outline-none! ' +
      'animate-popover-in motion-reduce:animate-fade-in data-instant:animate-none ' +
      'max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:max-w-none max-sm:max-h-[85dvh] max-sm:rounded-b-none',
    '[attr.aria-labelledby]': 'titleId',
    '[attr.aria-describedby]': 'dateId',
    '[attr.data-instant]': "instant() ? '' : null",
    '(keydown.escape)': 'dismiss(true)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class EntryPopover {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly entry = input.required<CalendarEntry>();
  /** The entry element it was opened from. Without one the card is centered. */
  readonly anchor = input<HTMLElement | null>(null);
  readonly today = input.required<string>();
  /** Opened from the keyboard: appear at once, with no motion. */
  readonly instant = input(false);
  /** True when focus should go back to the entry, as after Escape or the close button. */
  readonly closed = output<boolean>();

  private placed = false;

  readonly titleId = `entry-popover-title-${nextId}`;
  readonly dateId = `entry-popover-date-${nextId++}`;

  readonly tone = computed(() => entryTone(this.entry()));
  readonly square = computed(() => TONE_FILLS[this.tone()]);
  readonly when = computed(() => relativeDay(this.entry().date, this.today()));
  /** Like Google Calendar, the year shows only when it isn't this one. */
  readonly dateFormat = computed(() =>
    this.entry().date.slice(0, 4) === this.today().slice(0, 4) ? 'EEEE, MMMM d' : 'EEEE, MMMM d, y',
  );
  readonly source = computed(() => entrySource(this.entry()));
  readonly isBill = computed(() => this.entry().type === 'BILL_DUE');
  readonly paidInFull = computed(() => this.entry().balance !== null && Number(this.entry().balance) <= 0);

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Placed again whenever it points at another entry. The first placement also focuses it.
    effect(() => {
      this.entry();
      this.anchor();
      afterNextRender(() => this.place(), { injector: this.injector });
    });

    // Follow the entry while the page scrolls or the window resizes; close on a click outside.
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => this.place());
    };
    const outside = (event: PointerEvent) => {
      if (!this.host.nativeElement.contains(event.target as Node)) this.dismiss(false);
    };
    window.addEventListener('resize', follow);
    document.addEventListener('scroll', follow, { capture: true, passive: true });
    document.addEventListener('pointerdown', outside, { capture: true });
    destroyRef.onDestroy(() => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', follow);
      document.removeEventListener('scroll', follow, { capture: true });
      document.removeEventListener('pointerdown', outside, { capture: true });
    });
  }

  dismiss(restoreFocus: boolean): void {
    this.closed.emit(restoreFocus);
  }

  /** Tabbing out closes it. A click on its own text moves focus nowhere, so that stays open. */
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.host.nativeElement.contains(next)) this.dismiss(false);
  }

  private place(): void {
    const card = this.host.nativeElement;
    const anchor = this.anchor();
    // The calendar redrew and the entry's element is gone: stay put rather than jump.
    if (this.placed && anchor && !anchor.isConnected) return;
    const opening = !this.placed;
    this.placed = true;
    if (window.matchMedia(SHEET_QUERY).matches) {
      // The sheet's place comes from its classes.
      card.style.removeProperty('top');
      card.style.removeProperty('left');
      card.style.transformOrigin = 'bottom center';
    } else {
      const placement = placePopover(
        anchor?.isConnected ? anchor.getBoundingClientRect() : null,
        { width: card.offsetWidth, height: card.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
      );
      card.style.top = `${placement.top}px`;
      card.style.left = `${placement.left}px`;
      card.style.transformOrigin = placement.origin;
    }
    card.style.visibility = 'visible';
    // Only once visible: a hidden element cannot take focus.
    if (opening) card.focus({ preventScroll: true });
  }
}
