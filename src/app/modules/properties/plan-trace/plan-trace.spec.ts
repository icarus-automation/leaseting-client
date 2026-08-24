import { bitmapFromRows, closeGaps, countSet, dilate, erode, otsuThreshold } from './bitmap.util';
import { simplifyPolygon, traceOuterContour } from './contour.util';
import { floodFill } from './flood-fill.util';
import { DEFAULT_TRACE_OPTIONS, indexPlan, selectAt, traceRegions } from './plan-trace';
import { absorbSubRooms, regionAt } from './segment.util';

/**
 * A plan as ASCII: '#' is wall, '.' is open floor.
 *
 * Written this way because every bug in this pipeline is a spatial one, and a
 * grid you can read is the only way to tell "the fill leaked" apart from "the
 * contour cut a corner".
 */
function planFrom(rows: string[]): { luminance: Uint8Array; width: number; height: number } {
  const height = rows.length;
  const width = rows[0].length;
  const luminance = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      luminance[y * width + x] = rows[y][x] === '#' ? 20 : 235;
    }
  }
  return { luminance, width, height };
}

/** Two plain rooms side by side, separated by one solid wall. */
const PLAIN_ROOMS = [
  '####################',
  '#........##........#',
  '#........##........#',
  '#........##........#',
  '#........##........#',
  '#........##........#',
  '#........##........#',
  '#........##........#',
  '####################',
];

/**
 * The shape the real plans are drawn in: units either side of a corridor, each
 * a bedroom with an ensuite carved out of one corner. Both doors are drawn
 * shut, so every room is its own sealed enclosure — which is exactly why a
 * single flood fill returns a bedroom without its bathroom.
 *
 * Columns 1–9 are the left unit (bedroom above, ensuite bottom-left), 11–13
 * the corridor, 15–23 the right unit.
 */
const UNITS_WITH_ENSUITES = [
  '#########################',
  '#.........#...#.........#',
  '#.........#...#.........#',
  '#.........#...#.........#',
  '#.........#...#.........#',
  '#####.....#...#.....#####',
  '#...#.....#...#.....#...#',
  '#...#.....#...#.....#...#',
  '#########################',
];

/**
 * Ray casting, so a test can ask the question that actually matters: is the
 * bathroom inside the outline the manager would have got?
 *
 * Comparing bounding boxes or point counts only ever proves the polygon
 * changed shape, which it does for plenty of reasons that are not "it reached
 * the ensuite".
 */
function polygonContains(points: [number, number][], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const traceOptions = {
  ...DEFAULT_TRACE_OPTIONS,
  // These fixtures are a couple of dozen pixels across, so the production
  // radii and area floors would swallow them whole.
  closeRadius: 0,
  bridgeRadius: 1,
  minAreaRatio: 0.0001,
  maxAreaRatio: 0.9,
};

describe('otsuThreshold', () => {
  it('finds a cut between ink and paper', () => {
    const { luminance } = planFrom(PLAIN_ROOMS);
    // Otsu names the last level in the darker group, so on a two-valued image
    // it lands on the ink value itself — which binarizeInk includes.
    expect(otsuThreshold(luminance)).toBeGreaterThanOrEqual(20);
    expect(otsuThreshold(luminance)).toBeLessThan(235);
  });
});

describe('floodFill', () => {
  it('fills one room and stops at the dividing wall', () => {
    const ink = bitmapFromRows(PLAIN_ROOMS.map((row) => row.replace(/#/g, '1').replace(/\./g, '0')));
    const left = floodFill(ink, 4, 4);
    expect(left.area).toBe(56);
    expect(left.region.data[4 * 20 + 15]).toBe(0);
  });

  it('reports nothing when the tap lands on a wall', () => {
    const ink = bitmapFromRows(PLAIN_ROOMS.map((row) => row.replace(/#/g, '1').replace(/\./g, '0')));
    expect(floodFill(ink, 0, 0).area).toBe(0);
  });

  it('does not squeeze diagonally between two corner-touching walls', () => {
    // Four-connectivity is what keeps a doorway jamb from joining two rooms.
    const ink = bitmapFromRows(['00000', '00100', '01010', '00100', '00000']);
    expect(floodFill(ink, 2, 2).area).toBe(1);
  });
});

describe('morphology', () => {
  it('dilate then erode seals a gap without fattening the wall', () => {
    const broken = bitmapFromRows(['0000000', '0000000', '1110111', '0000000', '0000000']);
    const sealed = closeGaps(broken, 1);
    expect(sealed.data[2 * 7 + 3]).toBe(1);
    // The rows either side stay open — the wall is still one pixel thick.
    expect(sealed.data[1 * 7 + 3]).toBe(0);
    expect(sealed.data[3 * 7 + 3]).toBe(0);
  });

  it('erode treats outside the frame as set, so borders survive', () => {
    expect(countSet(erode(bitmapFromRows(['111', '111', '111']), 1))).toBe(9);
  });

  it('dilate grows by the radius in every direction', () => {
    // The passes are separable now, and a horizontal-only bug would be
    // invisible in a finished trace but would ruin every bridge.
    const dot = bitmapFromRows(['00000', '00000', '00100', '00000', '00000']);
    expect(countSet(dilate(dot, 1))).toBe(9);
    expect(countSet(dilate(dot, 2))).toBe(25);
  });
});

describe('segmentOpenSpace', () => {
  it('labels every sealed room separately', () => {
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);
    // Two bedrooms, two ensuites, one corridor.
    expect(index.segmentation.regions.size).toBe(5);
  });

  it('returns nothing for a point on a wall', () => {
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);
    expect(regionAt(index.segmentation, 0, 0)).toBeNull();
  });
});

describe('absorbSubRooms', () => {
  it('takes the ensuite that sits inside the bedroom rectangle', () => {
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);

    const bedroom = regionAt(index.segmentation, 6, 2);
    expect(bedroom).not.toBeNull();
    expect(absorbSubRooms(index.segmentation, bedroom!.id)).toHaveLength(1);
  });

  it('takes nothing when a room has no sub-rooms', () => {
    const { luminance, width, height } = planFrom(PLAIN_ROOMS);
    const index = indexPlan(luminance, width, height, traceOptions);
    const room = regionAt(index.segmentation, 4, 4);
    expect(absorbSubRooms(index.segmentation, room!.id)).toEqual([]);
  });

  it('refuses to swallow the floor from a corridor', () => {
    // A corridor's bounding box spans the building, so every small room in it
    // looks like a candidate. The cap on how many one room may absorb is the
    // only thing separating that from a bedroom with an ensuite.
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);

    const corridor = regionAt(index.segmentation, 12, 4);
    expect(corridor).not.toBeNull();
    expect(
      absorbSubRooms(index.segmentation, corridor!.id, {
        ...DEFAULT_TRACE_OPTIONS.absorb,
        maxSubRooms: 1,
      }),
    ).toEqual([]);
  });
});

describe('selectAt', () => {
  it('picks up the bedroom and its ensuite from one tap', () => {
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);

    const selection = selectAt(index, 6, 2, traceOptions);
    expect(selection).not.toBeNull();
    expect(selection!.regionIds).toHaveLength(2);
  });

  it('says nothing when the tap lands on a wall', () => {
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);
    expect(selectAt(index, 0, 0, traceOptions)).toBeNull();
  });
});

describe('traceRegions', () => {
  it('outlines a bedroom and its ensuite as one shape', () => {
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);

    const selection = selectAt(index, 6, 2, traceOptions)!;
    const result = traceRegions(index, selection.regionIds, traceOptions);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.points.length).toBeGreaterThanOrEqual(3);
    // The unit is the left third; nothing should reach the corridor.
    for (const [x] of result.points) expect(x).toBeLessThan(0.5);
  });

  it('encloses the ensuite, which a plain fill never would', () => {
    // This is the bug the whole rework exists for: with the ensuite door drawn
    // shut, one fill returns the bedroom and leaves the bathroom outside the
    // unit it belongs to.
    const { luminance, width, height } = planFrom(UNITS_WITH_ENSUITES);
    const index = indexPlan(luminance, width, height, traceOptions);
    const selection = selectAt(index, 6, 2, traceOptions)!;

    const whole = traceRegions(index, selection.regionIds, traceOptions);
    const bedroomOnly = traceRegions(index, [selection.room.id], traceOptions);

    expect(whole.ok && bedroomOnly.ok).toBe(true);
    if (!whole.ok || !bedroomOnly.ok) return;

    // A point in the middle of the ensuite, in normalized coordinates.
    const bathX = 2 / width;
    const bathY = 6.5 / height;

    expect(polygonContains(whole.points, bathX, bathY)).toBe(true);
    expect(polygonContains(bedroomOnly.points, bathX, bathY)).toBe(false);
  });

  it('unions two rooms the manager tapped separately', () => {
    const { luminance, width, height } = planFrom(PLAIN_ROOMS);
    const index = indexPlan(luminance, width, height, traceOptions);

    const left = selectAt(index, 4, 4, traceOptions)!;
    const right = selectAt(index, 15, 4, traceOptions)!;
    const result = traceRegions(index, [...left.regionIds, ...right.regionIds], {
      ...traceOptions,
      // Wide enough to bridge the two-pixel wall between them.
      bridgeRadius: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Math.max(...result.points.map(([x]) => x))).toBeGreaterThan(0.5);
  });

  it('refuses a selection covering most of the plan', () => {
    const { luminance, width, height } = planFrom(PLAIN_ROOMS);
    const index = indexPlan(luminance, width, height, traceOptions);
    const everything = [...index.segmentation.regions.keys()];
    expect(traceRegions(index, everything, { ...traceOptions, maxAreaRatio: 0.3 })).toEqual({
      ok: false,
      reason: 'too-large',
    });
  });

  it('refuses an empty selection', () => {
    const { luminance, width, height } = planFrom(PLAIN_ROOMS);
    const index = indexPlan(luminance, width, height, traceOptions);
    expect(traceRegions(index, [], traceOptions)).toEqual({ ok: false, reason: 'on-a-line' });
  });
});

describe('traceOuterContour', () => {
  it('walks the border of a filled rectangle', () => {
    const region = bitmapFromRows(['00000', '01110', '01110', '01110', '00000']);
    const contour = traceOuterContour(region);
    expect(contour.length).toBeGreaterThanOrEqual(8);
    for (const [x, y] of contour) expect(region.data[y * 5 + x]).toBe(1);
  });

  it('returns nothing for an empty region', () => {
    expect(traceOuterContour(bitmapFromRows(['000', '000']))).toEqual([]);
  });

  it('survives a single isolated pixel instead of spinning', () => {
    expect(traceOuterContour(bitmapFromRows(['000', '010', '000'])).length).toBeGreaterThan(0);
  });
});

describe('simplifyPolygon', () => {
  it('reduces a straight run to its endpoints', () => {
    const line: [number, number][] = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
    expect(simplifyPolygon(line, 0.5)).toEqual([[0, 0], [4, 0]]);
  });

  it('keeps a corner that matters', () => {
    const bend: [number, number][] = [[0, 0], [2, 0], [4, 0], [4, 4]];
    expect(simplifyPolygon(bend, 0.5)).toEqual([[0, 0], [4, 0], [4, 4]]);
  });
});
