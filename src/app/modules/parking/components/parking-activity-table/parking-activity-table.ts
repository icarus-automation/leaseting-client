import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import type { ParkingOverviewSession } from '../../../../core/models/parking-overview.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { sessionBadge } from '../../utils/parking-overview.util';

@Component({
  selector: 'app-parking-activity-table',
  host: { class: 'flex flex-col gap-2' },
  imports: [DatePipe, PhpCurrencyPipe, EmptyState, StatusBadge],
  templateUrl: './parking-activity-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingActivityTable {
  readonly sessions = input.required<ParkingOverviewSession[]>();
  readonly showProperty = input(false);
  readonly limit = input<number | null>(null);

  readonly badge = sessionBadge;
}
