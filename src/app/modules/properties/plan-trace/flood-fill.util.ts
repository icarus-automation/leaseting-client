import { Bitmap, bitmapAt, createBitmap } from './bitmap.util';

export interface FloodResult {
  /** The filled region, 1 where the fill reached. */
  region: Bitmap;
  /** Pixels filled — the caller uses this to spot a leak. */
  area: number;
}

/**
 * Fills outward from a seed, stopping at ink.
 *
 * Scanline rather than the four-way recursion this is usually written as: a
 * room on a 1200px-wide plan is a few hundred thousand pixels, and a per-pixel
 * recursion blows the stack on exactly the large rooms someone most wants to
 * trace. The explicit stack holds spans, so the worst case is bounded by the
 * number of rows.
 *
 * Four-connected on purpose. Eight-connectivity would let the fill squeeze
 * diagonally between two wall pixels that touch only at a corner — which is
 * what a doorway jamb looks like after thresholding, and is how one tap ends
 * up selecting two rooms.
 */
export function floodFill(ink: Bitmap, seedX: number, seedY: number): FloodResult {
  const { width, height } = ink;
  const region = createBitmap(width, height);

  if (seedX < 0 || seedY < 0 || seedX >= width || seedY >= height) return { region, area: 0 };
  // Seeding on a wall means the tap landed on a line rather than in a room.
  if (bitmapAt(ink, seedX, seedY) === 1) return { region, area: 0 };

  let area = 0;
  const stack: [number, number][] = [[seedX, seedY]];

  while (stack.length > 0) {
    const [startX, y] = stack.pop() as [number, number];
    if (region.data[y * width + startX] === 1) continue;

    let left = startX;
    while (left > 0 && ink.data[y * width + left - 1] === 0 && region.data[y * width + left - 1] === 0) {
      left -= 1;
    }

    let right = startX;
    while (
      right < width - 1 &&
      ink.data[y * width + right + 1] === 0 &&
      region.data[y * width + right + 1] === 0
    ) {
      right += 1;
    }

    for (let x = left; x <= right; x += 1) {
      region.data[y * width + x] = 1;
      area += 1;
    }

    for (const nextY of [y - 1, y + 1]) {
      if (nextY < 0 || nextY >= height) continue;
      let x = left;
      while (x <= right) {
        // One seed per contiguous open span on the neighbouring row; seeding
        // every pixel would push the same span dozens of times.
        if (ink.data[nextY * width + x] === 0 && region.data[nextY * width + x] === 0) {
          stack.push([x, nextY]);
          while (x <= right && ink.data[nextY * width + x] === 0) x += 1;
        }
        x += 1;
      }
    }
  }

  return { region, area };
}
