import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { AuthService } from '../../../core/auth/auth.service';
import { KitService } from '../../../core/kit/kit.service';
import { KitSetAside } from './kit-set-aside/kit-set-aside';
import {
  KIT_ART,
  KIT_SEVERITY_ICONS,
  KIT_SEVERITY_LABELS,
  KIT_SEVERITY_TONES,
  type KitSeverity,
  kitEventLink,
} from '../../../core/kit/kit.model';

@Component({
  selector: 'app-kit-card',
  imports: [DatePipe, RouterLink, PIcon, KitSetAside],
  templateUrl: './kit-card.html',
  styleUrl: './kit-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitCard {
  private readonly kit = inject(KitService);
  private readonly auth = inject(AuthService);

  readonly summary = input('');

  readonly severityLabels = KIT_SEVERITY_LABELS;
  readonly severityIcons = KIT_SEVERITY_ICONS;

  severityToneClass(severity: KitSeverity): string {
    return KIT_SEVERITY_TONES[severity];
  }

  readonly loading = this.kit.loading;
  readonly today = this.kit.loadedAt;
  readonly topEvent = this.kit.topEvent;
  readonly remainingCount = this.kit.remainingCount;
  readonly celebrating = this.kit.celebrating;

  readonly allClear = this.kit.allClear;
  readonly setAsideCount = this.kit.setAsideCount;

  readonly art = computed(() => KIT_ART[this.kit.mood()]);

  readonly sulking = computed(() => !this.celebrating() && this.kit.mood() === 'sad');
  readonly idling = computed(() => !this.celebrating() && !this.sulking());

  readonly greeting = computed(() => {
    const hour = this.kit.loadedAt().getHours();
    const name = this.auth.currentUser()?.name?.trim().split(/\s+/)[0];
    const daypart = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return name ? `${daypart}, ${name}` : daypart;
  });

  readonly link = computed(() => {
    const event = this.topEvent();
    return event ? kitEventLink(event) : null;
  });

  readonly restItems = computed(() =>
    this.kit.restEvents().map((event) => ({ event, link: kitEventLink(event) })),
  );

  readonly severityClass = computed(() => {
    switch (this.topEvent()?.severity) {
      case 'URGENT':
        return 'border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-muted-destructive text-destructive';
      case 'WARNING':
        return 'border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-muted-warning text-body';
      default:
        return 'border-border bg-surface text-muted';
    }
  });

  constructor() {
    this.kit.load();
  }

  dismiss(): void {
    const event = this.topEvent();
    if (event) this.kit.dismiss(event);
  }
}
