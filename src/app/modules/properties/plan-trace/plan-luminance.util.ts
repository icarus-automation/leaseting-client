export interface PlanLuminance {
  luminance: Uint8Array;
  width: number;
  height: number;
}

const MAX_WORKING_EDGE = 1200;

function luma(r: number, g: number, b: number): number {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * The plan image as a greyscale buffer, downscaled to a workable size.
 *
 * Returns null when the pixels cannot be read — a canvas tainted by a
 * cross-origin image without CORS headers throws on getImageData. The plan
 * route serves `Access-Control-Allow-Origin` and the image is loaded with
 * `crossOrigin="anonymous"`, so this is the "someone changed the media host"
 * case rather than an expected one; the caller falls back to hand-drawing.
 */
export function readPlanLuminance(image: HTMLImageElement): PlanLuminance | null {
  const scale = Math.min(1, MAX_WORKING_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, width, height);

  let pixels: ImageData;
  try {
    pixels = context.getImageData(0, 0, width, height);
  } catch {
    return null;
  }

  const luminance = new Uint8Array(width * height);
  for (let index = 0; index < luminance.length; index += 1) {
    const offset = index * 4;
    luminance[index] = luma(pixels.data[offset], pixels.data[offset + 1], pixels.data[offset + 2]);
  }

  return { luminance, width, height };
}
