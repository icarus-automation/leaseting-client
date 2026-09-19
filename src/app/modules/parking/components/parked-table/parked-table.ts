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

@Component({
  selector: 'app-parked-table',
  host: { class: 'flex flex-col gap-2' },
  imports: [DatePipe, PIcon, Menu, EmptyState],
  templateUrl: './parked-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkedTable {
  readonly sessions = input.required<ParkingOverviewSession[]>();
  readonly now = input.required<number>();
  readonly showProperty = input(false);
  readonly canVoid = input(false);
  readonly busyId = input<string | null>(null);
  readonly filtered = input(false);
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
