import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';

import type { ParkingOverviewSession } from '../../../../core/models/parking-overview.types';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { LONG_STAY_MINUTES, elapsedLabel, elapsedMinutes } from '../../utils/parking-overview.util';

interface ParkedRow {
  session: ParkingOverviewSession;
  elapsed: string;
  longStay: boolean;
}

/**
 * What is on the floor right now, oldest stay first.
 *
 * The elapsed column is the one an admin reads: it answers "has anything been
 * sitting here since last night?" without arithmetic against an entry
 * timestamp. Stays past twelve hours are marked, because that is the shape a
 * missed exit takes.
 */
@Component({
  selector: 'app-parked-table',
  host: { class: 'flex flex-col gap-2' },
  imports: [DatePipe, PIcon, EmptyState],
  templateUrl: './parked-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkedTable {
  readonly sessions = input.required<ParkingOverviewSession[]>();
  /** Ticked by the page so the elapsed column moves without a re-fetch. */
  readonly now = input.required<number>();
  readonly showProperty = input(false);
  readonly canVoid = input(false);
  readonly busyId = input<string | null>(null);
  readonly filtered = input(false);
  /** The API returned a full page, so there may be more vehicles than shown. */
  readonly capped = input(false);

  readonly voidRequested = output<ParkingOverviewSession>();

  readonly rows = computed<ParkedRow[]>(() => {
    const now = this.now();
    return this.sessions().map((session) => ({
      session,
      elapsed: elapsedLabel(session.entryAt, now),
      longStay: elapsedMinutes(session.entryAt, now) >= LONG_STAY_MINUTES,
    }));
  });
}
