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

export type NormPoint = [number, number];

export type TraceFailure =
  | 'on-a-line'
  | 'too-small'
  | 'too-large'
  | 'no-outline';

export type TraceResult =
  | { ok: true; points: NormPoint[]; regionIds: number[] }
  | { ok: false; reason: TraceFailure };

export interface TraceOptions {
  closeRadius: number;
  bridgeRadius: number;
  maxAreaRatio: number;
  minAreaRatio: number;
  simplifyRatio: number;
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

  const window = expandBounds(bounds, options.bridgeRadius + 2, width, height);
  const merged = closeGaps(cropBitmap(maskOf(segmentation, regionIds), window), options.bridgeRadius);

  const points = outlineOf(merged, width, height, options);
  if (points.length < 3) return { ok: false, reason: 'no-outline' };

  return {
    ok: true,
    regionIds: [...regionIds],
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

export const TRACE_FAILURE_MESSAGE: Record<TraceFailure, string> = {
  'on-a-line': 'That landed on a wall or a label. Tap in the open part of the room.',
  'too-small': 'That area is too small to be part of a unit.',
  'too-large': "That covers too much of the plan to be one unit. It looks like a hallway.",
  'no-outline': "Couldn't work out a clean outline there. Trace this one by hand.",
};

export type { Bounds, Region };
