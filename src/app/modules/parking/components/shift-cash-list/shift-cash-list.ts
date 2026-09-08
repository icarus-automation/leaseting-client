import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';

import type { ParkingOverviewShift } from '../../../../core/models/parking-overview.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { varianceLabel, varianceState } from '../../utils/parking-overview.util';

/**
 * Tills a guard has counted and handed over, waiting on an admin's sign-off.
 *
 * Expected is what the API totalled from the exits collected on that shift and
 * was frozen the moment the guard declared, so a rate edited since cannot move
 * the figure anyone is held to. Confirming agrees with the pair as they stand;
 * it never adjusts either number, and a variance is left visible rather than
 * reconciled away.
 */
@Component({
  selector: 'app-shift-cash-list',
  imports: [DatePipe, PIcon, PhpCurrencyPipe, EmptyState],
  templateUrl: './shift-cash-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftCashList {
  readonly shifts = input.required<ParkingOverviewShift[]>();
  readonly showProperty = input(false);
  readonly canConfirm = input(false);
  readonly busyId = input<string | null>(null);

  readonly confirmRequested = output<ParkingOverviewShift>();

  readonly varianceLabel = varianceLabel;
  readonly varianceState = varianceState;

  /** Short and over are both errors. Only an exact count reads as settled. */
  varianceClass(variance: string | null): string {
    switch (varianceState(variance)) {
      case 'balanced':
        return 'text-success';
      case 'pending':
        return 'text-muted';
      default:
        return 'text-destructive';
    }
  }
}
