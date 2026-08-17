import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import type { FloorUnitItem } from '../../../../core/models/property.types';

/**
 * Right-rail checklist while mapping: every unit on the floor with its
 * mapped/unmapped state, live progress, and click-to-target. Replaces the old
 * below-the-canvas chip tray (out of sight) and the static how-to aside.
 */
@Component({
  selector: 'app-map-units-panel',
  imports: [PIcon],
  templateUrl: './map-units-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapUnitsPanel {
  readonly units = input.required<FloorUnitItem[]>();
  readonly targetId = input<string | null>(null);
  readonly unitPicked = output<FloorUnitItem>();

  readonly helpOpen = signal(false);

  readonly mappedCount = computed(() => this.units().filter((unit) => this.isMapped(unit)).length);
  readonly totalCount = computed(() => this.units().length);
  readonly progressPercent = computed(() => {
    const total = this.totalCount();
    return total === 0 ? 0 : Math.round((this.mappedCount() / total) * 100);
  });

  isMapped(unit: FloorUnitItem): boolean {
    return (unit.mapCoordinates?.points?.length ?? 0) >= 3;
  }
}
