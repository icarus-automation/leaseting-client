import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import type { FloorDetail, FloorUnitItem } from '../../../../core/models/property.types';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { unitTone, unitToneLabel } from '../../../../shared/utils/unit-tone.util';

/**
 * Read-only floor-plan view: the plan image with an SVG polygon overlay.
 * Coordinates are normalized (0–1) in image space; the SVG uses
 * `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` so polygons stretch
 * exactly with the image. Editing shapes lives in FloorMapEditor (Konva).
 *
 * Status → color comes from the shared unitTone rule; shapes render as a
 * muted fill with a solid status-colored stroke so the plan reads calm
 * instead of blocks of saturated green/red.
 */
@Component({
  selector: 'app-floor-plan-viewer',
  imports: [PIcon, EmptyState],
  templateUrl: './floor-plan-viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanViewer {
  readonly floor = input.required<FloorDetail>();
  readonly selectedUnitId = input<string | null>(null);

  readonly unitClicked = output<FloorUnitItem>();
  readonly uploadPlanRequested = output<void>();
  readonly addUnitRequested = output<void>();

  readonly mappedUnits = computed(() =>
    this.floor().units.filter(
      (unit) => (unit.mapCoordinates?.points?.length ?? 0) >= 3,
    ),
  );

  readonly unmappedUnits = computed(() =>
    this.floor().units.filter(
      (unit) => (unit.mapCoordinates?.points?.length ?? 0) < 3,
    ),
  );

  /** Units shown as chips: unmapped ones, or all of them when there's no plan image. */
  readonly chipUnits = computed(() =>
    this.floor().planImageUrl ? this.unmappedUnits() : this.floor().units,
  );

  pointsAttr(unit: FloorUnitItem): string {
    return (unit.mapCoordinates?.points ?? [])
      .map(([x, y]) => `${x * 100},${y * 100}`)
      .join(' ');
  }

  fillClass(unit: FloorUnitItem): string {
    switch (unitTone(unit)) {
      case 'vacant':
        return 'fill-muted-vacant stroke-vacant';
      case 'destructive':
        return 'fill-muted-destructive stroke-destructive';
      default:
        return 'fill-muted-success stroke-success';
    }
  }

  dotClass(unit: FloorUnitItem): string {
    switch (unitTone(unit)) {
      case 'vacant':
        return 'bg-vacant';
      case 'destructive':
        return 'bg-destructive';
      default:
        return 'bg-success';
    }
  }

  statusLabel(unit: FloorUnitItem): string {
    return unitToneLabel(unit);
  }

  unitTitle(unit: FloorUnitItem): string {
    const tenant = unit.activeLease ? ` — ${unit.activeLease.tenantName}` : '';
    return `Unit ${unit.unitNo} · ${this.statusLabel(unit)}${tenant}`;
  }

  onPolygonKeydown(event: KeyboardEvent, unit: FloorUnitItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.unitClicked.emit(unit);
    }
  }
}
