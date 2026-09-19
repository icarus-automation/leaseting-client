import { Bitmap, bitmapAt, createBitmap } from './bitmap.util';

export interface FloodResult {
  region: Bitmap;
  area: number;
}

export function floodFill(ink: Bitmap, seedX: number, seedY: number): FloodResult {
  const { width, height } = ink;
  const region = createBitmap(width, height);

  if (seedX < 0 || seedY < 0 || seedX >= width || seedY >= height) return { region, area: 0 };
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
