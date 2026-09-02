import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type {
  FloorDetail,
  FloorUnitItem,
  PropertyDetail,
  PropertyFloorItem,
} from '../../../../core/models/property.types';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { FloorFormDialog } from '../../components/floor-form-dialog/floor-form-dialog';
import { FloorMapEditor } from '../../components/floor-map-editor/floor-map-editor';
import { FloorTabs } from '../../components/floor-tabs/floor-tabs';
import { MapUnitsPanel } from '../../components/map-units-panel/map-units-panel';
import { FloorPlanViewer } from '../../components/floor-plan-viewer/floor-plan-viewer';
import { PropertyFormDialog } from '../../components/property-form-dialog/property-form-dialog';
import { UnitFormDialog, UnitFormTarget } from '../../components/unit-form-dialog/unit-form-dialog';
import { UnitPanel } from '../../components/unit-panel/unit-panel';
import { FloorsService } from '../../services/floors.service';
import { PropertiesService } from '../../services/properties.service';
import { UnitsService } from '../../services/units.service';

@Component({
  selector: 'app-property-detail',
  imports: [
    RouterLink,
    PIcon,
    EmptyState,
    Skeleton,
    StatusBadge,
    FloorFormDialog,
    FloorMapEditor,
    FloorPlanViewer,
    FloorTabs,
    MapUnitsPanel,
    PropertyFormDialog,
    UnitFormDialog,
    UnitPanel,
  ],
  templateUrl: './property-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly properties = inject(PropertiesService);
  private readonly floors = inject(FloorsService);
  private readonly units = inject(UnitsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly propertyId = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly property = signal<PropertyDetail | null>(null);
  readonly propertyLoading = signal(true);
  readonly propertyError = signal<string | null>(null);

  readonly selectedFloorId = signal<string | null>(null);
  readonly floor = signal<FloorDetail | null>(null);
  readonly floorLoading = signal(false);

  readonly selectedUnitId = signal<string | null>(null);

  // Drawers
  readonly propertyDrawerVisible = signal(false);
  readonly floorDrawerVisible = signal(false);
  readonly floorEditTarget = signal<PropertyFloorItem | null>(null);
  readonly unitDrawerVisible = signal(false);
  readonly unitEditTarget = signal<UnitFormTarget | null>(null);

  // Map-units mode
  readonly mapMode = signal(false);
  readonly mapTarget = signal<FloorUnitItem | null>(null);
  readonly savingCoordinates = signal(false);
  /** Flashes the unit picker when the canvas is clicked with no target unit. */
  readonly pickerHint = signal(false);
  /** After a save, target the next unmapped unit once the fresh floor arrives. */
  private readonly autoAdvance = signal(false);

  /** The Konva polygon editor, present only while mapping. */
  readonly mapEditor = viewChild(FloorMapEditor);

  readonly activeFloor = computed(() => {
    const id = this.selectedFloorId();
    return this.property()?.floors.find((floor) => floor.id === id) ?? null;
  });

  /** Mapping needs a plan image to draw on. */
  readonly canMapUnits = computed(() => !!this.activeFloor()?.planImageUrl);

  /** Units without a shape yet — pick targets from these chips while mapping. */
  readonly unmappedUnits = computed(
    () =>
      this.floor()?.units.filter(
        (unit) => (unit.mapCoordinates?.points?.length ?? 0) < 3,
      ) ?? [],
  );

  /** Toolbar guidance for the current draft state, incl. the Enter shortcut. */
  readonly mapDrawHint = computed(() => {
    const editor = this.mapEditor();
    if (!editor) return '';
    if (editor.tapToFill()) {
      const rooms = editor.selectedRooms();
      // Says the quiet part out loud: a unit is usually more than one room, and
      // the second tap is the whole trick on a plan where the ensuite door is
      // drawn shut.
      if (rooms === 0) return ' · tap inside a room, and its ensuite comes with it';
      return ` · ${rooms} room${rooms === 1 ? '' : 's'} · tap another to add it, tap one again to drop it`;
    }
    if (editor.closed()) return ' · drag corners to fine-tune, then press Enter to save';
    return editor.points().length >= 3
      ? ' · click the first corner or press Enter to close & save'
      : ' · click the first corner to close';
  });

  readonly tapToFillOn = computed(() => this.mapEditor()?.tapToFill() ?? false);

  /**
   * Tap-to-fill traces one room from the plan image itself — no model, no
   * upload. It stays a mode rather than becoming the default because it only
   * works on a plan with closed walls, and a manager who taps and gets nothing
   * should still have the hand-drawing they already know underneath.
   */
  toggleTapToFill(): void {
    const editor = this.mapEditor();
    if (!editor) return;
    editor.tapToFill.update((on) => !on);
  }

  onTraceFailed(message: string): void {
    this.toast.add({ severity: 'warn', summary: 'Nothing traced', detail: message });
  }

  constructor() {
    effect(() => {
      const id = this.propertyId().get('id');
      if (id) this.loadProperty(id);
    });
  }

  loadProperty(id: string, preferredFloorId?: string): void {
    this.propertyLoading.set(true);
    this.propertyError.set(null);
    this.properties
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (property) => {
          this.property.set(property);
          this.propertyLoading.set(false);
          const fromQuery = this.route.snapshot.queryParamMap.get('floor');
          const wanted = preferredFloorId ?? fromQuery;
          const target =
            property.floors.find((floor) => floor.id === wanted) ?? property.floors[0] ?? null;
          if (target) {
            this.selectFloor(target.id);
          } else {
            this.selectedFloorId.set(null);
            this.floor.set(null);
          }
        },
        error: (error: unknown) => {
          this.propertyLoading.set(false);
          this.propertyError.set(apiErrorMessage(error, 'Could not load this property.'));
        },
      });
  }

  selectFloor(floorId: string): void {
    if (this.selectedFloorId() !== floorId) {
      this.selectedUnitId.set(null);
      this.exitMapMode();
    }
    this.selectedFloorId.set(floorId);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { floor: floorId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.loadFloor(floorId);
  }

  refreshFloor(): void {
    const id = this.selectedFloorId();
    if (id) this.loadFloor(id);
  }

  onUnitClicked(unit: FloorUnitItem): void {
    if (this.mapMode()) {
      this.mapTarget.set(unit);
      return;
    }
    this.selectedUnitId.set(unit.id);
  }

  toggleMapMode(): void {
    if (this.mapMode()) {
      this.exitMapMode();
    } else {
      if (!this.canMapUnits()) return;
      this.mapMode.set(true);
      this.selectedUnitId.set(null);
    }
  }

  onMappingHint(): void {
    this.pickerHint.set(true);
  }

  undoPoint(): void {
    this.mapEditor()?.undo();
  }

  redoPoint(): void {
    this.mapEditor()?.redo();
  }

  resetDraft(): void {
    this.mapEditor()?.reset();
  }

  saveMapping(): void {
    const target = this.mapTarget();
    const points = this.mapEditor()?.points() ?? [];
    if (!target || points.length < 3) return;

    this.savingCoordinates.set(true);
    this.units
      .update(target.id, { mapCoordinates: { points } })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingCoordinates.set(false);
          this.toast.add({
            severity: 'success',
            summary: `Unit ${target.unitNo} mapped`,
            detail: 'The plan now shows this unit.',
          });
          this.mapTarget.set(null);
          this.autoAdvance.set(true);
          this.refreshFloor();
        },
        error: (error: unknown) => {
          this.savingCoordinates.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not save the shape',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  /** Removes the stored shape for the current target (keeps the unit itself). */
  clearMapping(): void {
    const target = this.mapTarget();
    if (!target || (target.mapCoordinates?.points?.length ?? 0) < 3) return;

    this.savingCoordinates.set(true);
    this.units
      .update(target.id, { mapCoordinates: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingCoordinates.set(false);
          this.toast.add({
            severity: 'success',
            summary: `Unit ${target.unitNo} unmapped`,
            detail: 'Its shape was removed from the plan.',
          });
          this.mapTarget.set(null);
          this.refreshFloor();
        },
        error: (error: unknown) => {
          this.savingCoordinates.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not remove the shape',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  openCreateFloor(): void {
    this.floorEditTarget.set(null);
    this.floorDrawerVisible.set(true);
  }

  openEditFloor(): void {
    this.floorEditTarget.set(this.activeFloor());
    this.floorDrawerVisible.set(true);
  }

  onFloorSaved(floorId: string): void {
    this.toast.add({ severity: 'success', summary: 'Floor saved' });
    const id = this.propertyId().get('id');
    if (id) this.loadProperty(id, floorId);
  }

  onPropertySaved(): void {
    this.toast.add({ severity: 'success', summary: 'Property updated' });
    const id = this.propertyId().get('id');
    if (id) this.loadProperty(id, this.selectedFloorId() ?? undefined);
  }

  confirmDeleteFloor(): void {
    const floor = this.activeFloor();
    if (!floor) return;
    this.confirmation.confirm({
      header: 'Delete floor',
      message: `Delete floor ${floor.level}? Its units must be moved or removed first.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.floors
          .delete(floor.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Floor deleted' });
              const id = this.propertyId().get('id');
              if (id) this.loadProperty(id);
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Cannot delete floor',
                detail: apiErrorMessage(error, 'Remove or move its units first.'),
              });
            },
          });
      },
    });
  }

  openCreateUnit(): void {
    this.unitEditTarget.set(null);
    this.unitDrawerVisible.set(true);
  }

  openEditUnit(unit: UnitFormTarget): void {
    this.unitEditTarget.set(unit);
    this.unitDrawerVisible.set(true);
  }

  onUnitSaved(unitId: string): void {
    this.toast.add({ severity: 'success', summary: 'Unit saved' });
    this.refreshFloor();
    if (!this.mapMode()) this.selectedUnitId.set(unitId);
  }

  onUnitArchived(): void {
    this.selectedUnitId.set(null);
    this.refreshFloor();
  }

  private exitMapMode(): void {
    this.mapMode.set(false);
    this.mapTarget.set(null);
    this.pickerHint.set(false);
    this.autoAdvance.set(false);
  }

  private loadFloor(floorId: string): void {
    this.floorLoading.set(true);
    this.floors
      .get(floorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (floor) => {
          this.floor.set(floor);
          this.floorLoading.set(false);
          // Plan image may have been removed while mapping (floor edit drawer).
          if (this.mapMode() && !floor.planImageUrl) this.exitMapMode();
          // Mapping flow: after a save, hand the user the next unmapped unit —
          // resolved against the fresh floor so no stale unit refs survive.
          if (this.mapMode() && this.autoAdvance()) {
            this.autoAdvance.set(false);
            const next = floor.units.find(
              (unit) => (unit.mapCoordinates?.points?.length ?? 0) < 3,
            );
            this.mapTarget.set(next ?? null);
          }
        },
        error: (error: unknown) => {
          this.floorLoading.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not load floor',
            detail: apiErrorMessage(error),
          });
        },
      });
  }
}
