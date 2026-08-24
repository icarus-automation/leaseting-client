import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { SoaLine } from '../../../../core/models/soa.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';

@Component({
  selector: 'app-soa-lines',
  imports: [PhpCurrencyPipe],
  templateUrl: './soa-lines.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoaLines {
  readonly lines = input.required<readonly SoaLine[]>();
}
