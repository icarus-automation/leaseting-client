import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BrandLogoVariant = 'mark' | 'lockup-on-dark';

/**
 * Canonical Leaseting brand artwork.
 *
 * The supplied source files include generous artboard padding, so this
 * component crops them visually without altering the original assets.
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
  readonly variant = input<BrandLogoVariant>('mark');
  readonly decorative = input(false);
}
