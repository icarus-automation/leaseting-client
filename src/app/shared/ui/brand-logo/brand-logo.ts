import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

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
