import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { SoaLine, SoaUtilityLine } from '../../../../core/models/soa.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { UtilityChargeLines } from '../../../../shared/ui/utility-charge-lines/utility-charge-lines';
import type { UtilityChargeLine } from '../../../../shared/utils/utility-breakdown.util';

@Component({
  selector: 'app-soa-lines',
  imports: [PhpCurrencyPipe, UtilityChargeLines],
  templateUrl: './soa-lines.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoaLines {
  readonly lines = input.required<readonly SoaLine[]>();

  /** The statement's own lines for a utility bill, labelled by the API as in the download. */
  utilityLines(line: SoaUtilityLine): UtilityChargeLine[] | null {
    if (!line.breakdown?.length) return null;
    return line.breakdown.map((item) => ({
      label: item.label,
      amount: Number(item.amount),
      isTotal: item.label === 'Total',
    }));
  }
}
