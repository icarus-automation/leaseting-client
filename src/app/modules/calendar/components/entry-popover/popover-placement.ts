export interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Placement {
  top: number;
  left: number;
  side: 'right' | 'left' | 'below' | 'above' | 'center';
  /** Where the card grows from: the edge facing the entry, level with it. */
  origin: string;
}

/** Room kept between the card and the window edge, and between the card and its entry. */
export const VIEWPORT_MARGIN = 16;
export const ANCHOR_GAP = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Where an entry's card goes, the way Google Calendar places its event card:
 * beside the entry, right first and then left, top-aligned with it and kept on
 * screen. A row too wide for either side, like an agenda line, gets the card
 * below it, or above when below has no room. With no entry to point at, the
 * card is centered.
 */
export function placePopover(
  anchor: Box | null,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
): Placement {
  const maxTop = viewport.height - card.height - VIEWPORT_MARGIN;
  const maxLeft = viewport.width - card.width - VIEWPORT_MARGIN;

  if (!anchor) {
    return {
      top: clamp((viewport.height - card.height) / 2, VIEWPORT_MARGIN, maxTop),
      left: clamp((viewport.width - card.width) / 2, VIEWPORT_MARGIN, maxLeft),
      side: 'center',
      origin: 'center',
    };
  }

  const right = anchor.left + anchor.width;
  const bottom = anchor.top + anchor.height;

  const besideTop = clamp(anchor.top, VIEWPORT_MARGIN, maxTop);
  const originY = `${Math.round(clamp(anchor.top + anchor.height / 2 - besideTop, 0, card.height))}px`;
  if (right + ANCHOR_GAP + card.width <= viewport.width - VIEWPORT_MARGIN) {
    return { top: besideTop, left: right + ANCHOR_GAP, side: 'right', origin: `left ${originY}` };
  }
  if (anchor.left - ANCHOR_GAP - card.width >= VIEWPORT_MARGIN) {
    return { top: besideTop, left: anchor.left - ANCHOR_GAP - card.width, side: 'left', origin: `right ${originY}` };
  }

  const left = clamp(anchor.left, VIEWPORT_MARGIN, maxLeft);
  const originX = `${Math.round(clamp(anchor.left + anchor.width / 2 - left, 0, card.width))}px`;
  if (bottom + ANCHOR_GAP + card.height <= viewport.height - VIEWPORT_MARGIN) {
    return { top: bottom + ANCHOR_GAP, left, side: 'below', origin: `${originX} top` };
  }
  if (anchor.top - ANCHOR_GAP - card.height >= VIEWPORT_MARGIN) {
    return { top: anchor.top - ANCHOR_GAP - card.height, left, side: 'above', origin: `${originX} bottom` };
  }
  return { top: clamp(bottom + ANCHOR_GAP, VIEWPORT_MARGIN, maxTop), left, side: 'below', origin: `${originX} top` };
}

/** "Today", "Tomorrow", "In 3 days", "16 days ago": how far an entry's day is from today. */
export function relativeDay(date: string, today: string): string {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}
