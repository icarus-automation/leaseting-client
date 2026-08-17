import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { KIT_HEAD_ART, type KitMood } from '../../../core/kit/kit.model';

type KitHeadVariant = 'avatar' | 'badge' | 'hero' | 'panel';

/**
 * The only non-dashboard rendering of Kit.
 *
 * Keeping the head crop here prevents feature components from accidentally
 * reaching for the full-body artwork, which belongs exclusively to the
 * dashboard card.
 */
@Component({
  selector: 'app-kit-head',
  template: '',
  styleUrl: './kit-head.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[attr.data-variant]': 'variant()',
    '[style.background-image]': 'backgroundImage()',
  },
})
export class KitHead {
  readonly mood = input.required<KitMood>();
  readonly variant = input<KitHeadVariant>('avatar');

  readonly backgroundImage = computed(() => `url("${KIT_HEAD_ART[this.mood()]}")`);
}
