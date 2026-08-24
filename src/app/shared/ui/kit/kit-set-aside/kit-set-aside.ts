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

/**
 * The findings someone closed without acting on them.
 *
 * Exists because "All caught up — nothing needs you right now" was appearing
 * directly after a user clicked seven cards away, and none of the seven had
 * been dealt with. Dismissing was a one-way door with no record the user could
 * reach, which made Kit's quiet state a claim it had no basis for.
 *
 * Collapsed by default: this is a way back, not a second inbox. Anything the
 * nightly sweep has since resolved never reaches here at all, so every row is
 * still true today.
 */
/** Enough to show what is in there without becoming a second inbox. */
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

  /**
   * Icon colour by severity. Reinforcement, never the signal: sixteen rows of
   * identical grey circles told the reader nothing about which one was money
   * and which one was a date, but the label still has to say it in words.
   */
  severityToneClass(severity: KitSeverity): string {
    return KIT_SEVERITY_TONES[severity];
  }

  readonly open = signal(false);
  readonly expanded = signal(false);
  readonly count = this.kit.setAsideCount;

  /**
   * The first few, unless the user asked for the rest.
   *
   * Sixteen rows of set-aside findings is a second inbox pushed under a
   * disclosure, and it buries the page beneath it. Six is enough to see what
   * kind of thing is in there and decide whether to look properly.
   */
  readonly items = computed(() =>
    this.expanded() ? this.kit.setAside() : this.kit.setAside().slice(0, PREVIEW_LIMIT),
  );

  readonly hidden = computed(() => Math.max(this.count() - this.items().length, 0));

  toggle(): void {
    this.open.update((open) => !open);
    // Collapsing resets the preview, so reopening never lands on a long list
    // the user expanded once and has since forgotten about.
    if (!this.open()) this.expanded.set(false);
  }

  expand(): void {
    this.expanded.set(true);
  }

  restore(event: KitEvent): void {
    this.kit.restore(event);
    // Nothing left to review — fold away rather than leaving an empty panel.
    if (this.count() === 0) this.open.set(false);
  }
}
