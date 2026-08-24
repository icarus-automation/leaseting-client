import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

/** Crop rectangle in the source image's own pixels. */
interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Handle = 'nw' | 'ne' | 'se' | 'sw';

// Mouse affordance only — the keyboard path is arrow/shift+arrow on the
// selection itself, so these stay out of the accessibility tree.
const HANDLES: { key: Handle; position: string }[] = [
  { key: 'nw', position: '-left-1.5 -top-1.5 cursor-nwse-resize' },
  { key: 'ne', position: '-right-1.5 -top-1.5 cursor-nesw-resize' },
  { key: 'se', position: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
  { key: 'sw', position: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
];

/** Below this the selection is too small to be a usable plan. */
const MIN_CROP_PX = 120;
/** Cropped output is capped here — plans past this are detail nobody zooms to. */
const MAX_OUTPUT_WIDTH = 2400;
/** Arrow-key nudge, in source pixels. */
const NUDGE_PX = 12;

/**
 * Fixed-ratio image cropper. The caller hands it a picked File and gets back a
 * cropped one of exactly `aspect` — nothing downstream has to think about the
 * shape of what a user happened to upload.
 *
 * Renders inline (no dialog of its own) so it can live inside a form that is
 * already in a dialog. Drag the selection to move it, drag a corner to resize;
 * arrow keys nudge and shift+arrows resize, so it works without a mouse.
 */
@Component({
  selector: 'app-image-cropper',
  imports: [PIcon],
  templateUrl: './image-cropper.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageCropper {
  private readonly destroyRef = inject(DestroyRef);

  readonly file = input.required<File>();
  /** width / height the output is forced to. */
  readonly aspect = input(16 / 9);
  readonly title = input('Crop the image');
  readonly hint = input('Drag to reposition, drag a corner to resize. Everything outside the frame is trimmed.');
  readonly confirmLabel = input('Use image');

  readonly cropped = output<File>();
  readonly cancelled = output<void>();

  readonly handles = HANDLES;

  readonly sourceUrl = signal<string | null>(null);
  readonly loadError = signal(false);
  readonly working = signal(false);
  readonly rect = signal<CropRect>({ x: 0, y: 0, width: 0, height: 0 });

  private readonly imageEl = viewChild<ElementRef<HTMLImageElement>>('sourceImage');
  private naturalWidth = 0;
  private naturalHeight = 0;
  private objectUrl: string | null = null;
  private drag: { pointerId: number; mode: 'move' | Handle; startX: number; startY: number; start: CropRect } | null =
    null;

  /** Percent geometry so the overlay tracks the image at any rendered size. */
  readonly rectStyle = computed(() => {
    const { x, y, width, height } = this.rect();
    if (this.naturalWidth === 0 || this.naturalHeight === 0) return null;
    return {
      left: `${(x / this.naturalWidth) * 100}%`,
      top: `${(y / this.naturalHeight) * 100}%`,
      width: `${(width / this.naturalWidth) * 100}%`,
      height: `${(height / this.naturalHeight) * 100}%`,
    };
  });

  readonly ready = computed(() => this.rect().width > 0);

  /**
   * A full-cover rectangle with the selection punched out of it, so everything
   * the crop discards is visibly dimmed. Built here rather than in the template
   * because it is one long string of geometry, not markup.
   */
  readonly maskPath = computed(() => {
    const box = this.rectStyle();
    if (!box) return null;
    const right = `calc(${box.left} + ${box.width})`;
    const bottom = `calc(${box.top} + ${box.height})`;
    return (
      `polygon(0% 0%, 0% 100%, ${box.left} 100%, ${box.left} ${box.top}, ` +
      `${right} ${box.top}, ${right} ${bottom}, ${box.left} ${bottom}, ` +
      `${box.left} 100%, 100% 100%, 100% 0%)`
    );
  });

  constructor() {
    effect(() => {
      const file = this.file();
      untracked(() => this.loadFile(file));
    });

    this.destroyRef.onDestroy(() => this.revoke());
  }

  onImageLoad(event: Event): void {
    const image = event.target as HTMLImageElement;
    this.naturalWidth = image.naturalWidth;
    this.naturalHeight = image.naturalHeight;
    this.rect.set(this.largestCentredRect());
  }

  onImageError(): void {
    this.loadError.set(true);
  }

  // ── Pointer drag ───────────────────────────────────────────────

  startDrag(event: PointerEvent, mode: 'move' | Handle): void {
    if (!this.ready()) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.drag = {
      pointerId: event.pointerId,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      start: this.rect(),
    };
  }

  onDragMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const scale = this.displayScale();
    if (scale === 0) return;

    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    this.rect.set(drag.mode === 'move' ? this.movedRect(drag.start, dx, dy) : this.resizedRect(drag.start, drag.mode, dx, dy));
  }

  endDrag(event: PointerEvent): void {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    this.drag = null;
  }

  // ── Keyboard ───────────────────────────────────────────────────

  onSelectionKeydown(event: KeyboardEvent): void {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-NUDGE_PX, 0],
      ArrowRight: [NUDGE_PX, 0],
      ArrowUp: [0, -NUDGE_PX],
      ArrowDown: [0, NUDGE_PX],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();

    const current = this.rect();
    if (event.shiftKey) {
      // Shift resizes from the top-left corner, keeping the ratio.
      const step = delta[0] !== 0 ? delta[0] : delta[1];
      this.rect.set(this.resizedRect(current, 'se', step, step / this.aspect()));
    } else {
      this.rect.set(this.movedRect(current, delta[0], delta[1]));
    }
  }

  // ── Output ─────────────────────────────────────────────────────

  async confirm(): Promise<void> {
    const image = this.imageEl()?.nativeElement;
    const crop = this.rect();
    if (!image || crop.width === 0 || this.working()) return;

    this.working.set(true);
    try {
      const file = await this.renderCrop(image, crop);
      if (file) this.cropped.emit(file);
      else this.loadError.set(true);
    } finally {
      this.working.set(false);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private async renderCrop(image: HTMLImageElement, crop: CropRect): Promise<File | null> {
    const width = Math.min(Math.round(crop.width), MAX_OUTPUT_WIDTH);
    const height = Math.round(width / this.aspect());
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return null;
    // Plans are line art on white — a transparent PNG source would otherwise
    // composite onto black once flattened into JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);

    const source = this.file();
    // PNG keeps line art crisp; anything else is already lossy, so re-encode
    // as JPEG rather than inflating a photo into a huge PNG.
    const type = source.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (!blob) return null;

    const name = source.name.replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg');
    return new File([blob], name, { type, lastModified: Date.now() });
  }

  // ── Geometry ───────────────────────────────────────────────────

  private displayScale(): number {
    const image = this.imageEl()?.nativeElement;
    if (!image || this.naturalWidth === 0) return 0;
    return image.clientWidth / this.naturalWidth;
  }

  private largestCentredRect(): CropRect {
    const aspect = this.aspect();
    let width = this.naturalWidth;
    let height = width / aspect;
    if (height > this.naturalHeight) {
      height = this.naturalHeight;
      width = height * aspect;
    }
    return { x: (this.naturalWidth - width) / 2, y: (this.naturalHeight - height) / 2, width, height };
  }

  private movedRect(start: CropRect, dx: number, dy: number): CropRect {
    return {
      ...start,
      x: this.clamp(start.x + dx, 0, this.naturalWidth - start.width),
      y: this.clamp(start.y + dy, 0, this.naturalHeight - start.height),
    };
  }

  /**
   * Resizes from the grabbed corner with the opposite one pinned, then clamps
   * the result into the image. Width drives height so the ratio is exact by
   * construction rather than by correction.
   */
  private resizedRect(start: CropRect, handle: Handle, dx: number, dy: number): CropRect {
    const aspect = this.aspect();
    const anchorX = handle === 'nw' || handle === 'sw' ? start.x + start.width : start.x;
    const anchorY = handle === 'nw' || handle === 'ne' ? start.y + start.height : start.y;
    const growsRight = handle === 'ne' || handle === 'se';
    const growsDown = handle === 'sw' || handle === 'se';

    // Take whichever axis the pointer moved further along, so a diagonal drag
    // does not fight itself.
    const widthFromX = start.width + (growsRight ? dx : -dx);
    const widthFromY = (start.height + (growsDown ? dy : -dy)) * aspect;
    let width = Math.abs(dx) > Math.abs(dy) * aspect ? widthFromX : widthFromY;

    const maxWidth = Math.min(
      growsRight ? this.naturalWidth - anchorX : anchorX,
      (growsDown ? this.naturalHeight - anchorY : anchorY) * aspect,
    );
    width = this.clamp(width, Math.min(MIN_CROP_PX, maxWidth), maxWidth);
    const height = width / aspect;

    return {
      x: growsRight ? anchorX : anchorX - width,
      y: growsDown ? anchorY : anchorY - height,
      width,
      height,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }

  private loadFile(file: File): void {
    this.revoke();
    this.loadError.set(false);
    // Clear the previous image's geometry too, or a swapped-in file is briefly
    // measured against the old one's dimensions.
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.rect.set({ x: 0, y: 0, width: 0, height: 0 });
    this.objectUrl = URL.createObjectURL(file);
    this.sourceUrl.set(this.objectUrl);
  }

  private revoke(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
