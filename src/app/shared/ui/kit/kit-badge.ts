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
  private wasOpen = false;

  readonly severityLabels = KIT_SEVERITY_LABELS;
  readonly severityIcons = KIT_SEVERITY_ICONS;

  severityToneClass(severity: KitSeverity): string {
    return KIT_SEVERITY_TONES[severity];
  }

  readonly open = signal(false);
  readonly loading = this.kit.loading;
  readonly celebrating = this.kit.celebrating;
  readonly mood = this.kit.mood;

  readonly count = computed(() => this.kit.events().length);
  readonly setAsideCount = this.kit.setAsideCount;
  readonly allClear = this.kit.allClear;

  readonly items = computed(() =>
    this.kit.events().map((event) => ({ event, link: kitEventLink(event) })),
  );

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
    if (this.allClear()) this.close();
  }
}
