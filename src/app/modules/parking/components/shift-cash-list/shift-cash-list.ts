import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';

import type { ParkingOverviewShift } from '../../../../core/models/parking-overview.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { varianceLabel, varianceState } from '../../utils/parking-overview.util';

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
