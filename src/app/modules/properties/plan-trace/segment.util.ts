import { Bitmap, Bounds, createBitmap } from './bitmap.util';

export const INK_LABEL = -1;

export interface Region {
  id: number;
  area: number;
  bounds: Bounds;
}

export interface Segmentation {
  width: number;
  height: number;
  labels: Int32Array;
  regions: Map<number, Region>;
}

export function segmentOpenSpace(ink: Bitmap): Segmentation {
  const { width, height } = ink;
  const labels = new Int32Array(width * height).fill(INK_LABEL);
  const regions = new Map<number, Region>();

  let nextId = 0;
  const stack: number[] = [];

  for (let seed = 0; seed < labels.length; seed += 1) {
    if (ink.data[seed] === 1 || labels[seed] !== INK_LABEL) continue;

    const id = nextId;
    nextId += 1;

    let area = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;

    labels[seed] = id;
    stack.push(seed);

    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = (index - x) / width;

      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      if (x > 0) push(index - 1);
      if (x < width - 1) push(index + 1);
      if (y > 0) push(index - width);
      if (y < height - 1) push(index + width);
    }

    regions.set(id, { id, area, bounds: { minX, minY, maxX, maxY } });

    function push(neighbour: number): void {
      if (ink.data[neighbour] === 1 || labels[neighbour] !== INK_LABEL) return;
      labels[neighbour] = id;
      stack.push(neighbour);
    }
  }

  return { width, height, labels, regions };
}

export function regionAt(segmentation: Segmentation, x: number, y: number): Region | null {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= segmentation.width || py >= segmentation.height) return null;

  const label = segmentation.labels[py * segmentation.width + px];
  return label === INK_LABEL ? null : (segmentation.regions.get(label) ?? null);
}

export function maskOf(segmentation: Segmentation, regionIds: Iterable<number>): Bitmap {
  const wanted = new Set(regionIds);
  const mask = createBitmap(segmentation.width, segmentation.height);

  for (let index = 0; index < segmentation.labels.length; index += 1) {
    if (wanted.has(segmentation.labels[index])) mask.data[index] = 1;
  }

  return mask;
}

export function boundsOf(segmentation: Segmentation, regionIds: Iterable<number>): Bounds | null {
  let bounds: Bounds | null = null;

  for (const id of regionIds) {
    const region = segmentation.regions.get(id);
    if (!region) continue;
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, region.bounds.minX),
          minY: Math.min(bounds.minY, region.bounds.minY),
          maxX: Math.max(bounds.maxX, region.bounds.maxX),
          maxY: Math.max(bounds.maxY, region.bounds.maxY),
        }
      : { ...region.bounds };
  }

  return bounds;
}

export function boundsArea(bounds: Bounds): number {
  return (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
}

function containsRatio(inner: Bounds, outer: Bounds): number {
  const overlapWidth = Math.min(inner.maxX, outer.maxX) - Math.max(inner.minX, outer.minX) + 1;
  const overlapHeight = Math.min(inner.maxY, outer.maxY) - Math.max(inner.minY, outer.minY) + 1;
  if (overlapWidth <= 0 || overlapHeight <= 0) return 0;
  return (overlapWidth * overlapHeight) / boundsArea(inner);
}

export interface AbsorbOptions {
  maxSubRoomRatio: number;
  minEnclosedRatio: number;
  maxSubRooms: number;
}

export const DEFAULT_ABSORB_OPTIONS: AbsorbOptions = {
  maxSubRoomRatio: 0.6,
  minEnclosedRatio: 0.9,
  maxSubRooms: 3,
};

export function absorbSubRooms(
  segmentation: Segmentation,
  regionId: number,
  options: AbsorbOptions = DEFAULT_ABSORB_OPTIONS,
): number[] {
  const room = segmentation.regions.get(regionId);
  if (!room) return [];

  const candidates: number[] = [];

  for (const other of segmentation.regions.values()) {
    if (other.id === regionId) continue;
    if (other.area > room.area * options.maxSubRoomRatio) continue;
    if (containsRatio(other.bounds, room.bounds) < options.minEnclosedRatio) continue;

    candidates.push(other.id);
    if (candidates.length > options.maxSubRooms) return [];
  }

  return candidates;
}
