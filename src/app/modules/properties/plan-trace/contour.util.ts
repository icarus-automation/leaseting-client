import { Bitmap, bitmapAt } from './bitmap.util';

export type Point = [number, number];

/** The eight neighbours, clockwise from due west. */
const NEIGHBOURS: Point[] = [
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
];

/**
 * The outer boundary of a filled region, as a closed ring of pixels.
 *
 * Moore-neighbour tracing: start at the topmost-leftmost set pixel and walk
 * the border keeping the region on one side, backing up one step each time so
 * the walk cannot cut a corner.
 *
 * The walk stops the moment it returns to where it started. The textbook
 * alternative — Jacob's criterion, which waits until the start is re-entered
 * from the same direction — takes two full laps around any simple shape, and
 * a contour handed on with its ring duplicated is not merely redundant: an
 * even-odd point-in-polygon test on it reports every interior point as
 * outside, because each edge is crossed twice.
 *
 * One lap is complete for anything this pipeline produces. The case the longer
 * criterion exists for is a region with a one-pixel-wide spur, which a
 * morphological close has already removed by the time a mask reaches here.
 *
 * Holes are ignored by design. A room with a pillar or a text label in it is
 * still one room, and a unit polygon that dodged around its own label would be
 * both wrong and unusable.
 */
export function traceOuterContour(region: Bitmap): Point[] {
  const start = findStart(region);
  if (!start) return [];

  const contour: Point[] = [start];
  let current = start;
  // Entered the start from the west, since nothing to its left is set.
  let backtrack: Point = [start[0] - 1, start[1]];

  let guard = region.width * region.height * 4;

  while (guard > 0) {
    guard -= 1;

    const from = NEIGHBOURS.findIndex(
      ([dx, dy]) => current[0] + dx === backtrack[0] && current[1] + dy === backtrack[1],
    );
    let moved = false;

    for (let step = 1; step <= NEIGHBOURS.length; step += 1) {
      const direction = (from + step) % NEIGHBOURS.length;
      const [dx, dy] = NEIGHBOURS[direction];
      const next: Point = [current[0] + dx, current[1] + dy];

      if (bitmapAt(region, next[0], next[1]) === 0) {
        backtrack = next;
        continue;
      }

      if (next[0] === start[0] && next[1] === start[1]) return contour;

      contour.push(next);
      current = next;
      moved = true;
      break;
    }

    // A single isolated pixel has no neighbour to move to.
    if (!moved) return contour;
  }

  return contour;
}

function findStart(region: Bitmap): Point | null {
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      if (region.data[y * region.width + x] === 1) return [x, y];
    }
  }
  return null;
}

/**
 * Ramer–Douglas–Peucker: drops points that lie close to the line between the
 * ones that survive.
 *
 * A traced contour has one point per boundary pixel — a thousand of them for
 * an ordinary room. That is unusable as a saved polygon and unusable as a
 * thing to drag, so it is reduced to the corners that actually describe the
 * shape. Iterative rather than recursive for the same reason the fill is.
 */
export function simplifyPolygon(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2 || epsilon <= 0) return [...points];

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop() as [number, number];
    if (last <= first + 1) continue;

    let furthest = -1;
    let maxDistance = epsilon;

    for (let index = first + 1; index < last; index += 1) {
      const distance = perpendicularDistance(points[index], points[first], points[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        furthest = index;
      }
    }

    if (furthest === -1) continue;
    keep[furthest] = 1;
    stack.push([first, furthest], [furthest, last]);
  }

  return points.filter((_, index) => keep[index] === 1);
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(x - x1, y - y1);

  // Clamped so a point beyond either end measures to the endpoint, not to the
  // infinite line — without this a closed ring keeps points it should drop.
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}

/**
 * Collapses runs of near-collinear points left over after simplification, and
 * drops the duplicated closing point.
 *
 * Rooms are overwhelmingly rectangular, and a rectangle traced from pixels
 * comes back with a few stray points a degree off true. Removing them is what
 * makes the result look like something a person drew.
 */
export function dropCollinear(points: Point[], toleranceDegrees: number): Point[] {
  if (points.length <= 3) return [...points];

  const kept: Point[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];

    const angle = Math.abs(
      Math.atan2(next[1] - current[1], next[0] - current[0]) -
        Math.atan2(current[1] - previous[1], current[0] - previous[0]),
    );
    const turn = Math.min(angle, Math.PI * 2 - angle) * (180 / Math.PI);

    if (turn >= toleranceDegrees) kept.push(current);
  }

  return kept.length >= 3 ? kept : [...points];
}
