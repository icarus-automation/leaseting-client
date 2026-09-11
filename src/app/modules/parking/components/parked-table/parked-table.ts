import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';
import type { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

import type { ParkingOverviewSession } from '../../../../core/models/parking-overview.types';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { showPopupMenu } from '../../../../shared/utils/popup-menu.util';
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
 * missed exit takes. Voiding a stay is available, but not as a primary row
 * action — it lives in the overflow so it is not a sibling of routine reading.
 */
@Component({
  selector: 'app-parked-table',
  host: { class: 'flex flex-col gap-2' },
  imports: [DatePipe, PIcon, Menu, EmptyState],
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
  readonly overflowItems = signal<MenuItem[]>([]);
  readonly overflowForId = signal<string | null>(null);
  private readonly overflowMenu = viewChild.required<Menu>('overflowMenu');

  readonly rows = computed<ParkedRow[]>(() => {
    const now = this.now();
    return this.sessions().map((session) => ({
      session,
      elapsed: elapsedLabel(session.entryAt, now),
      longStay: elapsedMinutes(session.entryAt, now) >= LONG_STAY_MINUTES,
    }));
  });

  openOverflow(event: Event, session: ParkingOverviewSession): void {
    const items: MenuItem[] = [
      {
        label: 'Void stay',
        styleClass: 'row-overflow-danger',
        disabled: this.busyId() === session.id,
        command: () => this.voidRequested.emit(session),
      },
    ];
    this.overflowItems.set(items);
    this.overflowForId.set(session.id);
    showPopupMenu(this.overflowMenu(), event, items);
  }
}
