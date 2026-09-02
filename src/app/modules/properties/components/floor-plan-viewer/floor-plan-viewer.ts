import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import type { FloorDetail, FloorUnitItem } from '../../../../core/models/property.types';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PLAN_MIN_HEIGHT_PX, PLAN_VIEWPORT_RESERVE_PX } from '../../floor-plan.constants';
import { unitTone, unitToneLabel } from '../../../../shared/utils/unit-tone.util';

/**
 * Read-only floor-plan view: the plan image with an SVG polygon overlay.
 * Coordinates are normalized (0–1) in image space; the SVG uses
 * `viewBox="0 0 100 100"` + `preserveAspectRatio="none"` so polygons stretch
 * exactly with the image. Editing shapes lives in FloorMapEditor (Konva).
 *
 * The frame takes the plan's own aspect ratio and is capped to the viewport,
 * so the whole floor is on screen at once and nothing ever scrolls — not the
 * page, not the frame. New plans are cropped to a consistent ratio at upload
 * (see ImageCropper in the floor dialog); older ones still render whole.
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
  private readonly destroyRef = inject(DestroyRef);

  readonly floor = input.required<FloorDetail>();
  readonly selectedUnitId = input<string | null>(null);

  readonly unitClicked = output<FloorUnitItem>();
  readonly uploadPlanRequested = output<void>();
  readonly addUnitRequested = output<void>();

  /** width / height of the loaded plan; the frame matches it exactly. */
  readonly planAspect = signal(16 / 9);
  private readonly viewportHeight = signal(0);

  /**
   * Widest the frame may be before the plan runs off the bottom of the page.
   * Height is the scarce axis here — the frame is centred at whatever width
   * keeps the whole floor visible.
   */
  readonly maxPlanWidth = computed(() => {
    const viewport = this.viewportHeight();
    if (viewport === 0) return null;
    const budget = Math.max(PLAN_MIN_HEIGHT_PX, viewport - PLAN_VIEWPORT_RESERVE_PX);
    return Math.round(budget * this.planAspect());
  });

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

  constructor() {
    afterNextRender(() => {
      this.viewportHeight.set(window.innerHeight);
      const onResize = () => this.viewportHeight.set(window.innerHeight);
      window.addEventListener('resize', onResize);
      this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
    });
  }

  onPlanLoad(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.naturalHeight > 0) this.planAspect.set(image.naturalWidth / image.naturalHeight);
  }

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
    const tenant = unit.activeLease ? `, ${unit.activeLease.tenantName}` : '';
    return `Unit ${unit.unitNo} · ${this.statusLabel(unit)}${tenant}`;
  }

  onPolygonKeydown(event: KeyboardEvent, unit: FloorUnitItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.unitClicked.emit(unit);
    }
  }
}
