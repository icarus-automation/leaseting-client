import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The Leaseting lockup — the only approved brand artwork, everywhere. Every
 * logo in the app renders through here so a future asset swap is a one-file
 * change.
 *
 * Two things about the source file drive this component:
 * - it carries generous artboard padding, which the frame crops away visually
 *   without touching the original;
 * - the artwork is deep navy on transparency, so it must sit on a light
 *   surface. Every surface in this product is light, so that is never a
 *   constraint in practice — see the Light-Only Rule in DESIGN.md.
 *
 * Size it by setting `--brand-logo-height` on the host — e.g.
 * `class="[--brand-logo-height:32px]"`. That height means the height of the
 * *visible artwork*, not the padded artboard. Width follows the ratio.
 */
@Component({
  selector: 'app-brand-logo',
  imports: [NgOptimizedImage],
  templateUrl: './brand-logo.html',
  styleUrl: './brand-logo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': "decorative() ? 'true' : null",
  },
})
export class BrandLogo {
  readonly decorative = input(false);
}
