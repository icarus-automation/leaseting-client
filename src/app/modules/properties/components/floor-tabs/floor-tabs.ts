import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';

import type { PropertyFloorItem } from '../../../../core/models/property.types';

/** Past this many floors a scan-the-strip search stops working — offer a jump select. */
const JUMP_SELECT_THRESHOLD = 12;

/**
 * Single-row floor switcher. Tabs never wrap (a 50-floor tower stays one row):
 * overflow scrolls horizontally with edge fades + arrow paddles, the active
 * tab keeps itself scrolled into view, and a jump-select appears for tall
 * buildings. Proper ARIA tablist: roving tabindex, arrow keys move focus,
 * Enter/Space activates (manual activation — switching floors fires a fetch).
 */
@Component({
  selector: 'app-floor-tabs',
  imports: [FormsModule, PIcon, Select],
  templateUrl: './floor-tabs.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorTabs {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly floors = input.required<PropertyFloorItem[]>();
  readonly selectedFloorId = input<string | null>(null);
  readonly floorSelected = output<string>();
  readonly addFloorRequested = output<void>();

  readonly canScrollLeft = signal(false);
  readonly canScrollRight = signal(false);

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly tabEls = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  readonly showJump = computed(() => this.floors().length > JUMP_SELECT_THRESHOLD);
  readonly jumpOptions = computed(() =>
    this.floors().map((floor) => ({
      id: floor.id,
      label: `Floor ${floor.level}${floor.name ? ' · ' + floor.name : ''}`,
    })),
  );

  constructor() {
    afterNextRender(() => {
      this.updateScrollState();
      const observer = new ResizeObserver(() => this.updateScrollState());
      observer.observe(this.scroller().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Keep the active tab visible (deep links can land on a far floor), and
    // re-measure overflow whenever the floor list changes.
    effect(() => {
      this.floors();
      const id = this.selectedFloorId();
      setTimeout(() => {
        this.updateScrollState();
        if (!id) return;
        this.tabEls()
          .map((ref) => ref.nativeElement)
          .find((el) => el.dataset['floorId'] === id)
          ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
      });
    });
  }

  tabIndexFor(floor: PropertyFloorItem, index: number): number {
    const selected = this.selectedFloorId();
    if (selected) return floor.id === selected ? 0 : -1;
    return index === 0 ? 0 : -1;
  }

  updateScrollState(): void {
    const el = this.scroller().nativeElement;
    this.canScrollLeft.set(el.scrollLeft > 2);
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  scrollByPage(direction: 1 | -1): void {
    const el = this.scroller().nativeElement;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  onTablistKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const tabs = this.tabEls().map((ref) => ref.nativeElement);
    if (tabs.length === 0) return;
    const current = tabs.indexOf(this.document.activeElement as HTMLButtonElement);

    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = current < 0 ? 0 : (current + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        next = current < 0 ? tabs.length - 1 : (current - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      default:
        next = tabs.length - 1;
    }
    tabs[next].focus();
    tabs[next].scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
}
