import { ANCHOR_GAP, VIEWPORT_MARGIN, placePopover, relativeDay } from './popover-placement';

describe('placePopover', () => {
  const viewport = { width: 1440, height: 900 };
  const card = { width: 400, height: 300 };
  const entry = (left: number, top: number, width = 200, height = 20) => ({ left, top, width, height });

  it('opens to the right of an entry with room there, level with it, growing from that side', () => {
    const placement = placePopover(entry(300, 400), card, viewport);
    expect(placement).toEqual({ top: 400, left: 500 + ANCHOR_GAP, side: 'right', origin: 'left 10px' });
  });

  it('opens to the left of an entry near the right edge', () => {
    const placement = placePopover(entry(1100, 400), card, viewport);
    expect(placement.side).toBe('left');
    expect(placement.left).toBe(1100 - ANCHOR_GAP - 400);
    expect(placement.origin).toBe('right 10px');
  });

  it('keeps the card on screen for an entry near the bottom, and still grows from the entry', () => {
    const placement = placePopover(entry(300, 860), card, viewport);
    expect(placement.top).toBe(900 - 300 - VIEWPORT_MARGIN);
    expect(placement.top + card.height).toBeLessThanOrEqual(viewport.height - VIEWPORT_MARGIN);
    expect(placement.origin).toBe(`left ${860 + 10 - placement.top}px`);
  });

  it('drops below a row too wide for either side, like an agenda line', () => {
    const placement = placePopover(entry(260, 200, 1150, 44), card, viewport);
    expect(placement).toMatchObject({ side: 'below', top: 244 + ANCHOR_GAP, left: 260 });
  });

  it('goes above a wide row when below has no room', () => {
    const placement = placePopover(entry(260, 700, 1150, 44), card, viewport);
    expect(placement).toMatchObject({ side: 'above', top: 700 - ANCHOR_GAP - 300 });
  });

  it('centers the card when there is no entry to point at', () => {
    expect(placePopover(null, card, viewport)).toEqual({ top: 300, left: 520, side: 'center', origin: 'center' });
  });
});

describe('relativeDay', () => {
  it('says how far a day is from today', () => {
    expect(relativeDay('2026-11-27', '2026-11-27')).toBe('Today');
    expect(relativeDay('2026-11-28', '2026-11-27')).toBe('Tomorrow');
    expect(relativeDay('2026-11-26', '2026-11-27')).toBe('Yesterday');
    expect(relativeDay('2026-11-11', '2026-11-27')).toBe('16 days ago');
    expect(relativeDay('2026-12-30', '2026-11-27')).toBe('In 33 days');
  });
});
