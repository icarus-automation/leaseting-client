/**
 * A one-bit-per-pixel mask. 1 means "this pixel is part of the thing".
 *
 * Plain typed arrays rather than ImageData so every step of the trace can be
 * tested with a hand-written grid and no canvas — which matters, because the
 * failure modes here (a fill leaking through a gap, a contour walking off the
 * edge) are exactly the ones that are impossible to reason about from a
 * screenshot.
 */
export interface Bitmap {
  width: number;
  height: number;
  /** Row-major, length width × height. */
  data: Uint8Array;
}

export function createBitmap(width: number, height: number): Bitmap {
  return { width, height, data: new Uint8Array(width * height) };
}

export function bitmapAt(bitmap: Bitmap, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) return 0;
  return bitmap.data[y * bitmap.width + x];
}

/** Reads a grid of 0/1 rows — the shape every test in this folder is written in. */
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

/**
 * Otsu's threshold: the grey level that best separates the image into two
 * groups.
 *
 * Chosen over a fixed cutoff because these are photographs. A plan shot under
 * office light and the same plan shot by a window have completely different
 * absolute brightness, and any constant that works for one blacks out the
 * other. Otsu asks the histogram where the split is rather than being told.
 */
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

/**
 * Ink: everything darker than the threshold.
 *
 * On a floor plan that is walls, dimension lines, hatching and text. Only the
 * walls matter for tracing a room, but the rest is harmless — text sits inside
 * a room as a small island the fill flows around, and the contour follows the
 * outer boundary regardless.
 *
 * The comparison is inclusive because Otsu returns the last level belonging to
 * the darker group, not the first level above it. With `<` a high-contrast
 * plan — where the whole ink side of the histogram sits on one value — comes
 * back with no walls at all, and every tap floods the entire floor.
 */
export function binarizeInk(luminance: Uint8Array, width: number, height: number, threshold: number): Bitmap {
  const bitmap = createBitmap(width, height);
  for (let index = 0; index < luminance.length; index += 1) {
    bitmap.data[index] = luminance[index] <= threshold ? 1 : 0;
  }
  return bitmap;
}

/**
 * Grows the set pixels by `radius`, in the Chebyshev sense.
 *
 * Separated from {@link erode} so {@link closeGaps} can compose them, and so
 * each can be checked on its own — a dilate that is off by one row is
 * invisible in a finished trace but ruins every fill.
 */
export function dilate(bitmap: Bitmap, radius: number): Bitmap {
  return morph(bitmap, radius, true);
}

export function erode(bitmap: Bitmap, radius: number): Bitmap {
  return morph(bitmap, radius, false);
}

/**
 * Separable morphology with a square structuring element.
 *
 * Run as a horizontal pass then a vertical one, which is exact for a Chebyshev
 * neighbourhood and turns the cost from O(pixels x radius^2) into
 * O(pixels x radius). At the radii this file uses on a 1200px plan that is the
 * difference between a tap that feels instant and one that visibly stalls the
 * tab — and every tap re-runs a close.
 */
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
        // Outside the frame counts as set when eroding, so the border does not
        // quietly eat itself away on every pass.
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

/**
 * Dilate then erode — seals small breaks without fattening the walls.
 *
 * This is the step that makes the feature work on a photograph rather than a
 * clean export. A phone picture of a printed plan has walls broken by JPEG
 * ringing, glare and the paper's own texture, and a flood fill finds every one
 * of those gaps: without this, one tap floods the entire floor instead of one
 * room. Closing seals a break up to 2 × radius wide, then takes the walls back
 * to their original thickness so the traced room is still the right size.
 */
export function closeGaps(bitmap: Bitmap, radius: number): Bitmap {
  return erode(dilate(bitmap, radius), radius);
}

/** A rectangle of a bitmap, in that bitmap's own coordinates. */
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

/**
 * A rectangular window onto a bitmap.
 *
 * Every step after the fill — closing the union, tracing its outline — only
 * ever concerns one unit, which is a small fraction of a floor plan. Doing
 * that work on the full frame means a tap on a bedroom pays for the whole
 * building, on every tap.
 */
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
