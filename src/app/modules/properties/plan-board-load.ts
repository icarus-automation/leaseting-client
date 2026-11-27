import { signal } from '@angular/core';

export type PlanLoadStatus = 'loading' | 'ready' | 'error';

/**
 * Every plan load (warm-up, viewer, map editor) uses this CORS mode. The API answers media with
 * `Vary: Origin`, so mixing modes makes the browser keep two cache entries and download twice.
 */
export const PLAN_IMAGE_CROSS_ORIGIN = 'anonymous';

/** Starts downloading a plan into the browser cache, so a later load of the same URL reuses it. */
export function warmPlanImage(url: string): void {
  const image = new Image();
  image.crossOrigin = PLAN_IMAGE_CROSS_ORIGIN;
  image.src = url;
}

export function createPlanBoardLoad() {
  const status = signal<PlanLoadStatus>('loading');
  const image = signal<HTMLImageElement | null>(null);

  let attempt = 0;
  let lastUrl: string | null = null;
  let lastCrossOrigin: 'anonymous' | undefined;
  let pending: HTMLImageElement | null = null;

  function forgetPending(): void {
    if (!pending) return;
    pending.onload = null;
    pending.onerror = null;
    pending.src = '';
    pending = null;
  }

  function start(url: string | null, opts?: { crossOrigin?: 'anonymous' }): void {
    attempt += 1;
    const token = attempt;
    lastUrl = url;
    lastCrossOrigin = opts?.crossOrigin;
    forgetPending();
    image.set(null);
    if (!url) {
      status.set('error');
      return;
    }
    status.set('loading');

    const next = new Image();
    if (opts?.crossOrigin) next.crossOrigin = opts.crossOrigin;
    // Ignore onload from a previous floor or retry. A late decode must not mark the new URL ready.
    next.onload = () => {
      if (token !== attempt) return;
      image.set(next);
      status.set('ready');
    };
    next.onerror = () => {
      if (token !== attempt) return;
      image.set(null);
      status.set('error');
    };
    pending = next;
    next.src = url;
  }

  function retry(): void {
    start(lastUrl, lastCrossOrigin ? { crossOrigin: lastCrossOrigin } : undefined);
  }

  function abort(): void {
    attempt += 1;
    forgetPending();
  }

  return { status, image, start, retry, abort };
}
