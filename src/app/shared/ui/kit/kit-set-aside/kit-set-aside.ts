import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import { KitService } from '../../../../core/kit/kit.service';
import {
  KIT_SEVERITY_ICONS,
  KIT_SEVERITY_LABELS,
  KIT_SEVERITY_TONES,
  type KitEvent,
  type KitSeverity,
} from '../../../../core/kit/kit.model';

const PREVIEW_LIMIT = 6;

@Component({
  selector: 'app-kit-set-aside',
  imports: [PIcon],
  templateUrl: './kit-set-aside.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitSetAside {
  private readonly kit = inject(KitService);

  readonly severityIcons = KIT_SEVERITY_ICONS;
  readonly severityLabels = KIT_SEVERITY_LABELS;

  severityToneClass(severity: KitSeverity): string {
    return KIT_SEVERITY_TONES[severity];
  }

  readonly open = signal(false);
  readonly expanded = signal(false);
  readonly count = this.kit.setAsideCount;

  readonly items = computed(() =>
    this.expanded() ? this.kit.setAside() : this.kit.setAside().slice(0, PREVIEW_LIMIT),
  );

  readonly hidden = computed(() => Math.max(this.count() - this.items().length, 0));

  toggle(): void {
    this.open.update((open) => !open);
    if (!this.open()) this.expanded.set(false);
  }

  expand(): void {
    this.expanded.set(true);
  }

  restore(event: KitEvent): void {
    this.kit.restore(event);
    if (this.count() === 0) this.open.set(false);
  }
}
