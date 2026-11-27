import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PhpCurrencyPipe } from '../../pipes/php-currency-pipe';
import type { UtilityChargeLine } from '../../utils/utility-breakdown.util';

/** A utility bill's lines, Subtotal down to Total, the way every bill view lists them. */
@Component({
  selector: 'app-utility-charge-lines',
  imports: [PhpCurrencyPipe],
  template: `
    <dl class="m-0 flex flex-col gap-1 text-[12.5px] tabular-nums">
      @for (line of lines(); track line.label) {
        <div
          class="flex justify-between gap-3"
          [class.border-t]="line.isTotal"
          [class.border-border]="line.isTotal"
          [class.pt-1]="line.isTotal"
        >
          <dt class="min-w-0" [class.text-muted]="!line.isTotal" [class.font-semibold]="line.isTotal" [class.text-heading]="line.isTotal">
            {{ line.label }}
          </dt>
          <dd class="m-0 shrink-0 text-right" [class.text-body]="!line.isTotal" [class.font-semibold]="line.isTotal" [class.text-heading]="line.isTotal">
            {{ line.amount | phpCurrency }}
          </dd>
        </div>
      }
    </dl>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UtilityChargeLines {
  readonly lines = input.required<readonly UtilityChargeLine[]>();
}
