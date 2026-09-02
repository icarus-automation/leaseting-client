import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { KitService } from '../../../core/kit/kit.service';
import {
  KIT_SEVERITY_ICONS,
  KIT_SEVERITY_LABELS,
  KIT_SEVERITY_TONES,
  type KitEvent,
  type KitSeverity,
  kitEventLink,
} from '../../../core/kit/kit.model';
import { KitHead } from './kit-head';
import { KitSetAside } from './kit-set-aside/kit-set-aside';

/**
 * Kit, everywhere else in the app.
 *
 * The dashboard card is where Kit speaks unprompted; this is the way to reach
 * him from the other twelve screens without going home first. It stays a
 * badge, never a popup: it never auto-opens, never blocks anything, and
 * carries its count as text so the mascot's face is never the only signal.
 *
 * Deliberately hidden on the dashboard — the inline card is already saying the
 * same thing there, and two Kits on one screen is one too many.
 */
@Component({
  selector: 'app-kit-badge',
  imports: [RouterLink, PIcon, KitHead, KitSetAside],
  templateUrl: './kit-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class KitBadge {
  private readonly kit = inject(KitService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  /** Tracks the open→closed edge so the initial render doesn't grab focus. */
  private wasOpen = false;

  readonly severityLabels = KIT_SEVERITY_LABELS;
  readonly severityIcons = KIT_SEVERITY_ICONS;

  /** Icon colour by severity. The label beside it still carries the meaning. */
  severityToneClass(severity: KitSeverity): string {
    return KIT_SEVERITY_TONES[severity];
  }

  readonly open = signal(false);
  readonly loading = this.kit.loading;
  readonly celebrating = this.kit.celebrating;
  readonly mood = this.kit.mood;

  readonly count = computed(() => this.kit.events().length);
  readonly setAsideCount = this.kit.setAsideCount;
  /** Kit may only claim everything is done when nothing is merely set aside. */
  readonly allClear = this.kit.allClear;

  /** Event plus its deep link, resolved once per change rather than per binding. */
  readonly items = computed(() =>
    this.kit.events().map((event) => ({ event, link: kitEventLink(event) })),
  );

  /** Worst active severity — drives the ring colour and the accessible label. */
  readonly worst = computed(() => this.kit.events()[0]?.severity ?? null);

  readonly ringClass = computed(() => {
    switch (this.worst()) {
      case 'URGENT':
        return 'border-[color-mix(in_oklab,var(--destructive)_45%,transparent)]';
      case 'WARNING':
        return 'border-[color-mix(in_oklab,var(--warning)_50%,transparent)]';
      default:
        return 'border-border';
    }
  });

  readonly countClass = computed(() =>
    this.worst() === 'URGENT' ? 'bg-destructive' : 'bg-primary',
  );

  readonly label = computed(() => {
    const count = this.count();
    if (count === 0) return 'Kit: nothing needs your attention';
    return `Kit: ${count} item${count === 1 ? '' : 's'} needing attention`;
  });

  constructor() {
    effect(() => {
      const open = this.open();
      // Only on the closing edge: hand focus back to the button that opened
      // the panel instead of dropping it on the body.
      if (this.wasOpen && !open) this.trigger()?.nativeElement.focus({ preventScroll: true });
      this.wasOpen = open;
    });
  }

  toggle(): void {
    this.open.update((open) => !open);
  }

  close(): void {
    this.open.set(false);
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  dismiss(event: KitEvent): void {
    this.kit.dismiss(event);
    // Stay open when the last item was only set aside: closing on that would
    // hide the one control that undoes it, moments after the user learned it
    // exists.
    if (this.allClear()) this.close();
  }
}
