import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import Konva from 'konva';

import { PIcon } from '@primeicons/angular/p-icon';

import type { FloorDetail, FloorUnitItem } from '../../../../core/models/property.types';
import { unitTone } from '../../../../shared/utils/unit-tone.util';

type NormPoint = [number, number];

const SNAP_RADIUS = 12;
const MIN_SCREEN_WIDTH = 900;
// Mirrors --primary (oklch(0.50 0.16 262)); used only when the CSS var can't be read.
const FALLBACK_PRIMARY = '#2c5dbd';
const FALLBACK_PRIMARY_RGB = '44, 93, 189';
// Hex mirrors of styles.css status tokens — Konva needs concrete color strings,
// and these only kick in when getComputedStyle can't resolve the CSS vars.
const TOKEN_FALLBACKS: Record<string, string> = {
  '--primary': FALLBACK_PRIMARY,
  '--success': '#22964f',
  '--muted-success': '#dff0e5',
  '--destructive': '#c8402f',
  '--muted-destructive': '#f6e3e0',
  '--vacant': '#3d87c9',
  '--muted-vacant': '#e3eef7',
};

@Component({
  selector: 'app-floor-map-editor',
  imports: [PIcon],
  template: `
    <div
      #container
      class="relative w-full touch-none overflow-hidden rounded-base border border-border bg-white"
      [style.min-height.px]="120"
    >
      @if (pcOnly()) {
        <div class="flex h-40 flex-col items-center justify-center gap-1.5 px-4 text-center">
          <svg pIcon="desktop" class="text-muted" [size]="22" aria-hidden="true"></svg>
          <p class="text-[13px] font-medium text-muted">Floor plan editing requires a larger screen.</p>
          <p class="text-[12.5px] text-muted">Please use a laptop or PC.</p>
        </div>
      } @else if (imageError()) {
        <div class="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center" role="alert">
          <svg pIcon="exclamation-circle" class="text-destructive" [size]="20" aria-hidden="true"></svg>
          <p class="text-[13px] font-medium text-body">Couldn't load the floor plan.</p>
          <button
            type="button"
            class="inline-flex h-8 items-center rounded-base border border-border bg-background px-3 text-[13px] font-medium text-body transition-colors duration-150 ease-out hover:bg-surface motion-reduce:transition-none"
            (click)="retryLoad()"
          >
            Retry
          </button>
        </div>
      } @else if (!imageReady()) {
        <div class="flex h-40 items-center justify-center text-[13px] text-muted">Loading plan…</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorMapEditor {
  private readonly destroyRef = inject(DestroyRef);

  readonly floor = input.required<FloorDetail>();
  readonly target = input<FloorUnitItem | null>(null);

  readonly unitPicked = output<FloorUnitItem>();
  /** Delete pressed on an untouched saved shape — parent removes the stored mapping. */
  readonly clearRequested = output<void>();
  /** Canvas clicked with no target unit picked — parent nudges the unit picker. */
  readonly hintRequested = output<void>();

  readonly points = signal<NormPoint[]>([]);
  readonly closed = signal(false);
  readonly imageReady = signal(false);
  readonly imageError = signal(false);

  readonly canSave = computed(() => this.points().length >= 3);
  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  private readonly undoStack = signal<NormPoint[][]>([]);
  private readonly redoStack = signal<NormPoint[][]>([]);
  readonly selectedUnitId = signal<string | null>(null);
  readonly pcOnly = signal(false);

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');

  private stage: Konva.Stage | null = null;
  private imageLayer: Konva.Layer | null = null;
  private gridLayer: Konva.Layer | null = null;
  private unitsLayer: Konva.Layer | null = null;
  private draftLayer: Konva.Layer | null = null;
  private planImage: HTMLImageElement | null = null;
  private aspect = 0.6;
  private cursor: { x: number; y: number } | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private loadedUrl: string | null = null;
  private primaryColor = FALLBACK_PRIMARY;

  /** Live draft nodes, kept around so a drag can reposition them instead of rebuilding. */
  private draftAnchors: Konva.Circle[] = [];
  private draftShapeLine: Konva.Line | null = null;
  private draftGuideLine: Konva.Line | null = null;
  private draftRenderedClosed = false;

  /** Cleanup fn for the global keydown listener. */
  private keydownCleanup: (() => void) | null = null;

  constructor() {
    afterNextRender(() => {
      this.pcOnly.set(window.innerWidth < MIN_SCREEN_WIDTH);
      if (this.pcOnly()) return;
      this.initStage();
      this.loadImage();
    });

    effect(() => {
      const url = this.floor().planImageUrl;
      if (this.stage && url !== this.loadedUrl) this.loadImage();
    });

    // Re-seed + render whenever the target unit or floor data changes. The render calls
    // are wrapped in untracked(): renderUnits()/renderDraft() read `points`/`selectedUnitId`
    // internally, and without untracked() those reads make THIS effect a dependency of its
    // own output — every point placed during drawing re-triggers seedDraftFromTarget(), which
    // wipes the in-progress draft back to the target's last *saved* shape (or empty) on every
    // click, making drawing look completely dead.
    effect(() => {
      const target = this.target();
      this.floor();
      if (!this.stage) return;
      untracked(() => {
        this.seedDraftFromTarget(target);
        this.renderGrid();
        this.renderUnits();
        this.renderDraft();
      });
    });

    effect(() => {
      this.points();
      this.closed();
      if (this.stage) this.renderDraft();
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.keydownCleanup?.();
      this.stage?.destroy();
      this.stage = null;
    });
  }

  pushUndo(): void {
    const current = this.points();
    if (current.length === 0 && this.closed()) return;
    this.undoStack.update((stack) => [...stack, current.map(([x, y]) => [x, y] as NormPoint)]);
    this.redoStack.set([]);
  }

  undo(): void {
    const stack = this.undoStack();
    if (stack.length === 0) {
      if (this.closed()) {
        this.pushUndo();
        this.closed.set(false);
        return;
      }
      return;
    }
    const prev = stack[stack.length - 1];
    this.redoStack.update((r) => [...r, this.points().map(([x, y]) => [x, y] as NormPoint)]);
    this.undoStack.set(stack.slice(0, -1));
    this.points.set(prev);
    if (prev.length < 3) this.closed.set(false);
  }

  redo(): void {
    const stack = this.redoStack();
    if (stack.length === 0) return;
    const next = stack[stack.length - 1];
    this.undoStack.update((u) => [...u, this.points().map(([x, y]) => [x, y] as NormPoint)]);
    this.redoStack.set(stack.slice(0, -1));
    this.points.set(next);
    if (next.length >= 3) this.closed.set(true);
  }

  reset(): void {
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.points.set([]);
    this.closed.set(false);
    this.cursor = null;
  }

  // ── Stage setup ────────────────────────────────────────────────

  private initStage(): void {
    const host = this.container().nativeElement;
    this.stage = new Konva.Stage({ container: host, width: host.clientWidth || 600, height: 320 });
    this.imageLayer = new Konva.Layer({ listening: false });
    this.gridLayer = new Konva.Layer({ listening: false });
    this.unitsLayer = new Konva.Layer();
    this.draftLayer = new Konva.Layer();
    this.stage.add(this.imageLayer, this.gridLayer, this.unitsLayer, this.draftLayer);

    this.stage.on('mousedown touchstart', (e) => this.onStagePointerDown(e));
    this.stage.on('mousemove', () => this.onStageMouseMove());
    this.stage.on('mouseleave', () => {
      this.cursor = null;
      this.renderDraft();
    });
    this.stage.on('dblclick dbltap', () => this.closeIfPossible());

    this.bindKeyboard();
    this.cachePrimaryColor();

    this.resizeObserver = new ResizeObserver(() => this.fitStage());
    this.resizeObserver.observe(host);
  }

  retryLoad(): void {
    this.loadImage();
  }

  private loadImage(): void {
    const url = this.floor().planImageUrl;
    this.loadedUrl = url;
    this.imageReady.set(false);
    this.imageError.set(false);
    if (!url) return;
    const image = new Image();
    // Keep 'anonymous': the media route is public, and a CORS-approved image
    // keeps the Konva canvas untainted.
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      this.planImage = image;
      this.aspect = image.naturalHeight / image.naturalWidth;
      this.imageReady.set(true);
      this.fitStage();
    };
    image.onerror = () => {
      this.imageReady.set(false);
      this.imageError.set(true);
      this.loadedUrl = null;
    };
    image.src = url;
  }

  private fitStage(): void {
    if (!this.stage || !this.imageLayer) return;
    const host = this.container().nativeElement;
    const width = host.clientWidth;
    if (width === 0) return;
    const height = Math.round(width * this.aspect);
    this.stage.size({ width, height });

    this.imageLayer.destroyChildren();
    if (this.planImage) {
      this.imageLayer.add(new Konva.Image({ image: this.planImage, width, height, listening: false }));
    }
    this.imageLayer.batchDraw();
    this.renderGrid();
    this.renderUnits();
    this.renderDraft();
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────

  private bindKeyboard(): void {
    const listener = (e: KeyboardEvent) => {
      if (this.isInputFocused()) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.reset();
        return;
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) { this.redo(); } else { this.undo(); }
        return;
      }
      if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.redo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.onDeleteKey();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.closeIfPossible();
        this.dispatchSave();
        return;
      }
    };
    document.addEventListener('keydown', listener);
    this.keydownCleanup = () => document.removeEventListener('keydown', listener);
  }

  readonly saveRequested = output<void>();

  private dispatchSave(): void {
    if (this.canSave()) this.saveRequested.emit();
  }

  /**
   * Delete on an untouched saved shape removes the stored mapping; any
   * in-progress edit only discards the local draft.
   */
  private onDeleteKey(): void {
    const savedShape = (this.target()?.mapCoordinates?.points?.length ?? 0) >= 3;
    const untouched = this.undoStack().length === 0 && this.redoStack().length === 0;
    if (savedShape && this.closed() && untouched) {
      this.clearRequested.emit();
      return;
    }
    this.reset();
  }

  private isInputFocused(): boolean {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (active as HTMLElement).isContentEditable;
  }

  // ── Drawing interactions ───────────────────────────────────────

  private stagePointer(): { x: number; y: number } | null {
    const stage = this.stage;
    if (!stage) return null;
    return stage.getPointerPosition();
  }

  private onStagePointerDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>): void {
    if (e.target !== this.stage && !(e.target instanceof Konva.Image)) return;
    if (!this.target()) {
      this.hintRequested.emit();
      return;
    }
    if (this.closed()) return;

    const pos = this.stagePointer();
    if (!pos || !this.stage) return;

    const pts = this.points();
    if (pts.length >= 3) {
      const first = this.toPx(pts[0]);
      if (Math.hypot(pos.x - first.x, pos.y - first.y) <= SNAP_RADIUS) {
        this.pushUndo();
        this.closed.set(true);
        return;
      }
    }

    this.pushUndo();
    this.points.update((current) => [...current, this.toNorm(pos)]);
  }

  private onStageMouseMove(): void {
    if (this.closed() || this.points().length === 0) return;
    this.cursor = this.stagePointer();
    this.renderDraft();
  }

  private closeIfPossible(): void {
    if (!this.closed() && this.points().length >= 3) {
      this.pushUndo();
      this.closed.set(true);
    }
  }

  // ── Rendering ──────────────────────────────────────────────────

  private renderGrid(): void {
    const layer = this.gridLayer;
    if (!layer || !this.stage) return;
    layer.destroyChildren();

    const stage = this.stage;
    const w = stage.width();
    const h = stage.height();
    if (w === 0 || h === 0) return;

    const stepPct = 0.1;

    const stroke = 'rgba(48,52,70,0.07)';
    const strokeW = 0.5;

    for (let x = 0; x <= 1 + stepPct / 2; x += stepPct) {
      const px = x * w;
      layer.add(new Konva.Line({
        points: [px, 0, px, h],
        stroke,
        strokeWidth: strokeW,
        listening: false,
      }));
    }
    for (let y = 0; y <= 1 + stepPct / 2; y += stepPct) {
      const py = y * h;
      layer.add(new Konva.Line({
        points: [0, py, w, py],
        stroke,
        strokeWidth: strokeW,
        listening: false,
      }));
    }

    layer.batchDraw();
  }

  private renderUnits(): void {
    const layer = this.unitsLayer;
    if (!layer || !this.stage) return;
    layer.destroyChildren();

    const targetId = this.target()?.id;
    const selectedId = this.selectedUnitId();
    for (const unit of this.floor().units) {
      const shape = unit.mapCoordinates?.points;
      if (!shape || shape.length < 3 || unit.id === targetId) continue;

      const flat = shape.flatMap(([x, y]) => {
        const px = this.toPx([x, y]);
        return [px.x, px.y];
      });

      const isSelected = unit.id === selectedId;
      const polygon = new Konva.Line({
        points: flat,
        closed: true,
        fill: this.unitFill(unit).fill,
        opacity: isSelected ? 1 : 0.75,
        stroke: isSelected ? this.primaryColor : this.unitFill(unit).stroke,
        strokeWidth: isSelected ? 2.5 : 1.5,
      });
      polygon.on('click tap', () => {
        this.selectedUnitId.set(unit.id);
        this.unitPicked.emit(unit);
        this.renderUnits();
      });
      polygon.on('mouseenter', () => {
        if (!isSelected) polygon.opacity(0.95);
        layer.batchDraw();
        this.setCursor('pointer');
      });
      polygon.on('mouseleave', () => {
        if (!isSelected) polygon.opacity(0.75);
        layer.batchDraw();
        this.setCursor(this.target() ? 'crosshair' : 'default');
      });
      layer.add(polygon);

      const centroid = this.centroidPx(shape);
      const label = new Konva.Text({
        text: unit.unitNo,
        fontSize: 12,
        fontStyle: '600',
        fontFamily: 'Work Sans, sans-serif',
        fill: 'rgba(20, 22, 34, 0.85)',
        listening: false,
      });
      label.position({ x: centroid.x - label.width() / 2, y: centroid.y - label.height() / 2 });
      layer.add(label);
    }
    layer.batchDraw();
    this.setCursor(this.target() ? 'crosshair' : 'default');
  }

  private renderDraft(): void {
    const layer = this.draftLayer;
    if (!layer || !this.stage) return;

    const pts = this.points();
    const closed = this.closed();
    const px = pts.map((p) => this.toPx(p));
    const flat = px.flatMap((p) => [p.x, p.y]);

    // Same point count and open/closed state as last render — only coordinates
    // moved (e.g. a corner mid-drag). Reposition the existing nodes instead of
    // destroying and recreating them: destroying the node Konva is currently
    // dragging cuts its native drag tracking short, which is what made
    // resizing a shape go dead after the first few pixels.
    if (pts.length > 0 && pts.length === this.draftAnchors.length && closed === this.draftRenderedClosed) {
      this.draftAnchors.forEach((anchor, i) => anchor.position(px[i]));
      this.draftShapeLine?.points(flat);
      if (this.draftGuideLine) {
        this.draftGuideLine.points(this.cursor ? [...flat, this.cursor.x, this.cursor.y] : flat);
      }
      layer.batchDraw();
      return;
    }

    this.rebuildDraft(layer, pts, px, flat, closed);
  }

  private rebuildDraft(
    layer: Konva.Layer,
    pts: NormPoint[],
    px: { x: number; y: number }[],
    flat: number[],
    closed: boolean,
  ): void {
    layer.destroyChildren();
    this.draftAnchors = [];
    this.draftShapeLine = null;
    this.draftGuideLine = null;
    this.draftRenderedClosed = closed;

    if (pts.length === 0) {
      layer.batchDraw();
      return;
    }

    const primary = this.primaryColor;

    if (closed) {
      const polygon = new Konva.Line({
        points: flat,
        closed: true,
        fill: this.colorMix(primary, 0.22),
        stroke: primary,
        strokeWidth: 2,
        draggable: true,
      });
      polygon.on('mouseenter', () => this.setCursor('move'));
      polygon.on('mouseleave', () => this.setCursor('crosshair'));
      polygon.on('dragend', () => {
        const dx = polygon.x();
        const dy = polygon.y();
        this.points.update((current) =>
          current.map(([x, y]) => this.clampNorm(this.toNormDelta(x, y, dx, dy))),
        );
        polygon.position({ x: 0, y: 0 });
      });
      layer.add(polygon);
      this.draftShapeLine = polygon;
    } else {
      const linePoints = [...flat];
      if (this.cursor) linePoints.push(this.cursor.x, this.cursor.y);
      const guide = new Konva.Line({
        points: linePoints,
        stroke: primary,
        strokeWidth: 2,
        dash: [6, 4],
        listening: false,
      });
      layer.add(guide);
      this.draftGuideLine = guide;

      if (pts.length >= 3) {
        const preview = new Konva.Line({
          points: flat,
          closed: true,
          fill: this.colorMix(primary, 0.12),
          listening: false,
        });
        layer.add(preview);
        this.draftShapeLine = preview;
      }
    }

    // Vertex anchors — draggable once placed.
    px.forEach((p, index) => {
      const isFirst = index === 0;
      const snappable = isFirst && !closed && pts.length >= 3;
      const anchor = new Konva.Circle({
        x: p.x,
        y: p.y,
        radius: snappable ? 7 : 5,
        fill: '#ffffff',
        stroke: primary,
        strokeWidth: snappable ? 2.5 : 2,
        draggable: true,
      });
      anchor.on('mouseenter', () => this.setCursor(snappable ? 'pointer' : 'grab'));
      anchor.on('mouseleave', () => this.setCursor('crosshair'));
      if (snappable) {
        anchor.on('click tap', () => this.closed.set(true));
      }
      anchor.on('dragmove', () => {
        const stage = this.stage;
        const clamped = {
          x: Math.min(Math.max(anchor.x(), 0), stage?.width() ?? 0),
          y: Math.min(Math.max(anchor.y(), 0), stage?.height() ?? 0),
        };
        anchor.position(clamped);
        this.points.update((current) =>
          current.map((point, i) => (i === index ? this.toNorm(clamped) : point)),
        );
      });
      layer.add(anchor);
      this.draftAnchors.push(anchor);
    });

    layer.batchDraw();
  }

  // ── Draft seeding ──────────────────────────────────────────────

  private seedDraftFromTarget(target: FloorUnitItem | null): void {
    this.selectedUnitId.set(target?.id ?? null);
    const existing = target?.mapCoordinates?.points;
    if (existing && existing.length >= 3) {
      this.points.set(existing.map(([x, y]) => [x, y] as NormPoint));
      this.closed.set(true);
      this.undoStack.set([]);
      this.redoStack.set([]);
    } else {
      this.reset();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────

  private toPx([x, y]: NormPoint): { x: number; y: number } {
    const stage = this.stage;
    return stage ? { x: x * stage.width(), y: y * stage.height() } : { x: 0, y: 0 };
  }

  private toNorm(pos: { x: number; y: number }): NormPoint {
    const stage = this.stage;
    if (!stage || stage.width() === 0 || stage.height() === 0) return [0, 0];
    return this.clampNorm([pos.x / stage.width(), pos.y / stage.height()]);
  }

  private toNormDelta(x: number, y: number, dxPx: number, dyPx: number): NormPoint {
    const stage = this.stage;
    if (!stage) return [x, y];
    return [x + dxPx / stage.width(), y + dyPx / stage.height()];
  }

  private clampNorm([x, y]: NormPoint): NormPoint {
    return [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)];
  }

  private centroidPx(shape: number[][]): { x: number; y: number } {
    const px = shape.map(([x, y]) => this.toPx([x, y]));
    const sum = px.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / px.length, y: sum.y / px.length };
  }

  /** Muted fill + solid status stroke, matching FloorPlanViewer's tone classes. */
  private unitFill(unit: FloorUnitItem): { fill: string; stroke: string } {
    switch (unitTone(unit)) {
      case 'vacant':
        return { fill: this.readToken('--muted-vacant'), stroke: this.readToken('--vacant') };
      case 'destructive':
        return { fill: this.readToken('--muted-destructive'), stroke: this.readToken('--destructive') };
      default:
        return { fill: this.readToken('--muted-success'), stroke: this.readToken('--success') };
    }
  }

  private readToken(name: string): string {
    return (
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
      TOKEN_FALLBACKS[name] ||
      FALLBACK_PRIMARY
    );
  }

  private cachePrimaryColor(): void {
    this.primaryColor = this.readToken('--primary');
  }

  private colorMix(color: string, alpha: number): string {
    return color.startsWith('oklch') ? this.oklchToRgba(color, alpha) : this.hexToRgba(color, alpha);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const value = hex.replace('#', '');
    if (value.length !== 6) return `rgba(${FALLBACK_PRIMARY_RGB}, ${alpha})`;
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private oklchToRgba(oklch: string, alpha: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return `rgba(${FALLBACK_PRIMARY_RGB}, ${alpha})`;
    ctx.fillStyle = oklch;
    const resolved = ctx.fillStyle;
    if (resolved.startsWith('#')) return this.hexToRgba(resolved, alpha);
    const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(resolved);
    if (!match) return `rgba(${FALLBACK_PRIMARY_RGB}, ${alpha})`;
    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
  }

  private setCursor(cursor: string): void {
    const host = this.container().nativeElement;
    host.style.cursor = cursor;
  }
}
