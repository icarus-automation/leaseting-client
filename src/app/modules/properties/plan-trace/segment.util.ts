import { Bitmap, Bounds, createBitmap } from './bitmap.util';

/** Marks a pixel that is wall rather than floor. */
export const INK_LABEL = -1;

/** One enclosed area of floor — a bedroom, a bathroom, a corridor. */
export interface Region {
  id: number;
  area: number;
  bounds: Bounds;
}

export interface Segmentation {
  width: number;
  height: number;
  /** Region id per pixel, or {@link INK_LABEL}. */
  labels: Int32Array;
  regions: Map<number, Region>;
}

/**
 * Every enclosed area of floor on the plan, labelled once.
 *
 * This is the change that makes tap-to-fill work on a real building. A single
 * flood fill can only ever return the one area you tapped, and on a plan where
 * the ensuite door is drawn shut that is the bedroom *without* its bathroom —
 * two sealed areas that are one unit. Labelling the whole plan up front turns
 * "which pixels are connected to this tap" into "which rooms is this unit made
 * of", which is a question that has a right answer.
 *
 * Done once per image and cached: it costs one pass, and every tap afterwards
 * is a lookup.
 *
 * Four-connected, matching the fill it replaces — eight-connectivity lets a
 * region squeeze diagonally between two wall pixels that touch only at a
 * corner, which is what a doorway jamb looks like after thresholding.
 */
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

/** The region under a point, or null when the point landed on ink. */
export function regionAt(segmentation: Segmentation, x: number, y: number): Region | null {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= segmentation.width || py >= segmentation.height) return null;

  const label = segmentation.labels[py * segmentation.width + px];
  return label === INK_LABEL ? null : (segmentation.regions.get(label) ?? null);
}

/** A mask covering the given regions. */
export function maskOf(segmentation: Segmentation, regionIds: Iterable<number>): Bitmap {
  const wanted = new Set(regionIds);
  const mask = createBitmap(segmentation.width, segmentation.height);

  for (let index = 0; index < segmentation.labels.length; index += 1) {
    if (wanted.has(segmentation.labels[index])) mask.data[index] = 1;
  }

  return mask;
}

/** The rectangle covering every listed region. */
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
  /** A sub-room may be at most this share of the room it belongs to. */
  maxSubRoomRatio: number;
  /** How much of a candidate must sit inside the tapped room's rectangle. */
  minEnclosedRatio: number;
  /**
   * Most sub-rooms one room may absorb.
   *
   * This is what tells a bedroom apart from a corridor. A bedroom's rectangle
   * contains its own ensuite and nothing else; a corridor's rectangle contains
   * the entire floor. Both look identical to every other rule here — the count
   * is the thing that separates them, so a tap on a hallway returns the
   * hallway instead of the building.
   */
  maxSubRooms: number;
}

export const DEFAULT_ABSORB_OPTIONS: AbsorbOptions = {
  maxSubRoomRatio: 0.6,
  minEnclosedRatio: 0.9,
  maxSubRooms: 3,
};

/**
 * The rooms that belong with the one that was tapped.
 *
 * A unit is usually drawn as a rectangle with its smaller rooms carved out of
 * a corner, which leaves the main room L-shaped and the ensuite sitting inside
 * the same rectangle. That is the shape this looks for: small, mostly inside
 * the tapped room's own bounding box, and few.
 *
 * Every condition is a guard against the same failure — swallowing the floor.
 * When any of them says no the answer is just the room that was tapped, which
 * is never wrong, only incomplete, and the manager can add the rest by tapping
 * it. That asymmetry is deliberate: a missing bathroom is visible on the
 * canvas, a silently over-large unit is not.
 */
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
    // Bail as soon as it is clear this is not a room with an ensuite. A
    // corridor has dozens of candidates and there is no point pricing them.
    if (candidates.length > options.maxSubRooms) return [];
  }

  return candidates;
}
