import {
  Bitmap,
  Bounds,
  binarizeInk,
  closeGaps,
  cropBitmap,
  expandBounds,
  otsuThreshold,
} from './bitmap.util';
import { Point, dropCollinear, simplifyPolygon, traceOuterContour } from './contour.util';
import {
  AbsorbOptions,
  DEFAULT_ABSORB_OPTIONS,
  Region,
  Segmentation,
  absorbSubRooms,
  boundsOf,
  maskOf,
  regionAt,
  segmentOpenSpace,
} from './segment.util';

/** A polygon point in the 0–1 space the floor plan overlay is stored in. */
export type NormPoint = [number, number];

export type TraceFailure =
  /** The tap landed on a wall, a dimension line or a label. */
  | 'on-a-line'
  /** What was enclosed is too small to be part of a unit. */
  | 'too-small'
  /** The selection covers so much of the plan it cannot be one unit. */
  | 'too-large'
  /** A region was found but no usable outline came out of it. */
  | 'no-outline';

export type TraceResult =
  | { ok: true; points: NormPoint[]; regionIds: number[] }
  | { ok: false; reason: TraceFailure };

export interface TraceOptions {
  /**
   * Pixels of wall thickness to seal across when finding rooms.
   *
   * The single most important knob for photographs: too low and rooms merge
   * through JPEG noise, too high and a real doorway closes up. Two is right for
   * a phone photo of a printed plan at the working resolution.
   */
  closeRadius: number;
  /**
   * Pixels of interior partition to bridge when joining selected rooms.
   *
   * A bedroom and its ensuite are separate enclosures with a partition between
   * them, so their union is two disconnected blobs and an outline traced from
   * it would follow only one. Closing across the partition merges them into
   * the single rectangle the unit actually is. Sized to a partition, not to a
   * structural wall — going wider starts swallowing the corridor.
   */
  bridgeRadius: number;
  /** Above this share of the plan, a selection cannot be one unit. */
  maxAreaRatio: number;
  /** Below this share, whatever was enclosed is noise rather than a room. */
  minAreaRatio: number;
  /** Simplification tolerance, as a share of the image's smaller side. */
  simplifyRatio: number;
  /** Turns gentler than this are treated as a straight wall. */
  collinearToleranceDegrees: number;
  absorb: AbsorbOptions;
}

export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  closeRadius: 2,
  bridgeRadius: 5,
  maxAreaRatio: 0.6,
  minAreaRatio: 0.002,
  simplifyRatio: 0.006,
  collinearToleranceDegrees: 8,
  absorb: DEFAULT_ABSORB_OPTIONS,
};

/**
 * A plan broken into its rooms, ready to be tapped at.
 *
 * Built once per image because the expensive half — threshold, close, label —
 * does not depend on where anyone taps. Everything after it is a lookup and a
 * trace over one unit's worth of pixels.
 */
export interface PlanIndex {
  segmentation: Segmentation;
  width: number;
  height: number;
}

export function indexPlan(
  luminance: Uint8Array,
  width: number,
  height: number,
  options: TraceOptions = DEFAULT_TRACE_OPTIONS,
): PlanIndex {
  const ink = closeGaps(
    binarizeInk(luminance, width, height, otsuThreshold(luminance)),
    options.closeRadius,
  );
  return { segmentation: segmentOpenSpace(ink), width, height };
}

/**
 * What one tap selects: the room under it, plus any sub-rooms that belong with
 * it — an ensuite, a walk-in, a small utility space.
 *
 * Returns null when the tap landed on a wall or a label.
 */
export function selectAt(
  index: PlanIndex,
  x: number,
  y: number,
  options: TraceOptions = DEFAULT_TRACE_OPTIONS,
): { room: Region; regionIds: number[] } | null {
  const room = regionAt(index.segmentation, x, y);
  if (!room) return null;

  return {
    room,
    regionIds: [room.id, ...absorbSubRooms(index.segmentation, room.id, options.absorb)],
  };
}

/**
 * The outline around a set of rooms.
 *
 * Rooms rather than a flood fill is the whole point. A unit is whatever
 * collection of enclosures the manager says it is: one tap usually gets it,
 * two taps get the awkward ones, and no heuristic has to be right for the
 * result to be right.
 */
export function traceRegions(
  index: PlanIndex,
  regionIds: readonly number[],
  options: TraceOptions = DEFAULT_TRACE_OPTIONS,
): TraceResult {
  if (regionIds.length === 0) return { ok: false, reason: 'on-a-line' };

  const { segmentation, width, height } = index;
  const total = width * height;

  let area = 0;
  for (const id of regionIds) area += segmentation.regions.get(id)?.area ?? 0;

  if (area / total < options.minAreaRatio) return { ok: false, reason: 'too-small' };
  if (area / total > options.maxAreaRatio) return { ok: false, reason: 'too-large' };

  const bounds = boundsOf(segmentation, regionIds);
  if (!bounds) return { ok: false, reason: 'no-outline' };

  // Everything from here works inside the selection's own rectangle. A unit is
  // a small fraction of a floor plan, and closing plus tracing the full frame
  // on every tap is the difference between instant and sluggish.
  const window = expandBounds(bounds, options.bridgeRadius + 2, width, height);
  const merged = closeGaps(cropBitmap(maskOf(segmentation, regionIds), window), options.bridgeRadius);

  const points = outlineOf(merged, width, height, options);
  if (points.length < 3) return { ok: false, reason: 'no-outline' };

  return {
    ok: true,
    regionIds: [...regionIds],
    // Offset back out of the crop, then normalized to 0–1 so the polygon
    // survives the plan being re-rendered at any size — the same contract the
    // hand-drawn shapes already use.
    points: points.map(
      ([x, y]) =>
        [clamp01((x + window.minX) / width), clamp01((y + window.minY) / height)] as NormPoint,
    ),
  };
}

function outlineOf(mask: Bitmap, width: number, height: number, options: TraceOptions): Point[] {
  const contour = traceOuterContour(mask);
  if (contour.length < 3) return [];

  const epsilon = Math.min(width, height) * options.simplifyRatio;
  return dropCollinear(simplifyPolygon(contour, epsilon), options.collinearToleranceDegrees);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** How each failure reads to the person who just tapped. */
export const TRACE_FAILURE_MESSAGE: Record<TraceFailure, string> = {
  'on-a-line': 'That landed on a wall or a label. Tap in the open part of the room.',
  'too-small': 'That area is too small to be part of a unit.',
  'too-large': "That covers too much of the plan to be one unit — it's probably a hallway.",
  'no-outline': "Couldn't work out a clean outline there. Trace this one by hand.",
};

export type { Bounds, Region };
