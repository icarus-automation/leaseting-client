export interface Bitmap {
  width: number;
  height: number;
  data: Uint8Array;
}

export function createBitmap(width: number, height: number): Bitmap {
  return { width, height, data: new Uint8Array(width * height) };
}

export function bitmapAt(bitmap: Bitmap, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return 0;
  return bitmap.data[y * bitmap.width + x];
}

export function bitmapFromRows(rows: string[]): Bitmap {
  const height = rows.length;
  const width = height > 0 ? rows[0].length : 0;
  const bitmap = createBitmap(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      bitmap.data[y * width + x] = rows[y][x] === '1' ? 1 : 0;
    }
  }
  return bitmap;
}

export function countSet(bitmap: Bitmap): number {
  let total = 0;
  for (let index = 0; index < bitmap.data.length; index += 1) total += bitmap.data[index];
  return total;
}

export function otsuThreshold(luminance: Uint8Array): number {
  const histogram = new Uint32Array(256);
  for (let index = 0; index < luminance.length; index += 1) histogram[luminance[index]] += 1;

  const total = luminance.length;
  let sum = 0;
  for (let level = 0; level < 256; level += 1) sum += level * histogram[level];

  let sumBackground = 0;
  let weightBackground = 0;
  let bestVariance = -1;
  let threshold = 127;

  for (let level = 0; level < 256; level += 1) {
    weightBackground += histogram[level];
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += level * histogram[level];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;

    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = level;
    }
  }

  return threshold;
}

export function binarizeInk(luminance: Uint8Array, width: number, height: number, threshold: number): Bitmap {
  const bitmap = createBitmap(width, height);
  for (let index = 0; index < luminance.length; index += 1) {
    bitmap.data[index] = luminance[index] <= threshold ? 1 : 0;
  }
  return bitmap;
}

export function dilate(bitmap: Bitmap, radius: number): Bitmap {
  return morph(bitmap, radius, true);
}

export function erode(bitmap: Bitmap, radius: number): Bitmap {
  return morph(bitmap, radius, false);
}

function morph(bitmap: Bitmap, radius: number, grow: boolean): Bitmap {
  if (radius <= 0) return { ...bitmap, data: Uint8Array.from(bitmap.data) };
  return sweep(sweep(bitmap, radius, grow, true), radius, grow, false);
}

function sweep(bitmap: Bitmap, radius: number, grow: boolean, horizontal: boolean): Bitmap {
  const { width, height } = bitmap;
  const out = createBitmap(width, height);
  const outerCount = horizontal ? height : width;
  const innerCount = horizontal ? width : height;

  for (let outer = 0; outer < outerCount; outer += 1) {
    for (let inner = 0; inner < innerCount; inner += 1) {
      let hit = grow ? 0 : 1;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const at = inner + offset;
        const value =
          at < 0 || at >= innerCount
            ? grow
              ? 0
              : 1
            : horizontal
              ? bitmap.data[outer * width + at]
              : bitmap.data[at * width + outer];

        if (grow && value === 1) {
          hit = 1;
          break;
        }
        if (!grow && value === 0) {
          hit = 0;
          break;
        }
      }

      if (horizontal) out.data[outer * width + inner] = hit;
      else out.data[inner * width + outer] = hit;
    }
  }

  return out;
}

export function closeGaps(bitmap: Bitmap, radius: number): Bitmap {
  return erode(dilate(bitmap, radius), radius);
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function expandBounds(bounds: Bounds, by: number, width: number, height: number): Bounds {
  return {
    minX: Math.max(0, bounds.minX - by),
    minY: Math.max(0, bounds.minY - by),
    maxX: Math.min(width - 1, bounds.maxX + by),
    maxY: Math.min(height - 1, bounds.maxY + by),
  };
}

export function cropBitmap(bitmap: Bitmap, bounds: Bounds): Bitmap {
  const width = bounds.maxX - bounds.minX + 1;
  const height = bounds.maxY - bounds.minY + 1;
  const out = createBitmap(width, height);

  for (let y = 0; y < height; y += 1) {
    const sourceRow = (bounds.minY + y) * bitmap.width + bounds.minX;
    out.data.set(bitmap.data.subarray(sourceRow, sourceRow + width), y * width);
  }

  return out;
}
