import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import type { ParkingOverviewSession } from '../../../../core/models/parking-overview.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { sessionBadge } from '../../utils/parking-overview.util';

/**
 * Stays that have ended, newest first. Read-only, on purpose.
 *
 * A collected exit is not editable from here and neither is a void: the log is
 * the record of what happened at the gate, and the only way to add to it is to
 * void an open stay on the floor tab.
 */
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
  /** How many rows the page asked for, so the footer can name the window. */
  readonly limit = input<number | null>(null);

  readonly badge = sessionBadge;
}
