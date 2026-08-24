import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from '../config/api';
import type { KitEvent, KitMood, KitSeverity } from './kit.model';

/**
 * Ordering for a restored item.
 *
 * The server ranks by severity band plus an urgency the client never sees, so
 * this can only put a restored row back in the right *band* — close enough to
 * read correctly until the next load, and honest about being an approximation
 * rather than pretending to reproduce the server's order.
 */
const SEVERITY_RANK: Record<KitSeverity, number> = { URGENT: 3, WARNING: 2, INFO: 1 };

function severityRank(event: KitEvent): number {
  return SEVERITY_RANK[event.severity];
}

/**
 * Celebration is capped, deliberately. A mascot that keeps moving in the
 * corner of a screen someone stares at all day is the Clippy failure mode —
 * three bounces, then Kit settles back down.
 */
const CELEBRATION_MS = 2_500;

/**
 * Kit's state. Kit is proactive: nothing here waits for the user to ask. The
 * dashboard loads events on init and Kit speaks first, surfacing only the
 * highest-ranked item so it reads as a secretary's "this one today" rather
 * than a notification feed.
 *
 * No polling in v1 — events are produced by a nightly sweep and Kit currently
 * lives on one page, so a 60s timer would be pure network chatter. That
 * changes when the global badge ships.
 */
@Injectable({ providedIn: 'root' })
export class KitService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/kit`;

  private readonly _events = signal<KitEvent[]>([]);
  private readonly _setAside = signal<KitEvent[]>([]);
  private readonly _loading = signal(true);
  private readonly _celebrating = signal(false);
  private readonly _loadedAt = signal(new Date());
  private celebrationTimer?: ReturnType<typeof setTimeout>;

  readonly events = this._events.asReadonly();
  readonly loading = this._loading.asReadonly();

  /**
   * Wall clock at the last load. Kit's greeting reads the daypart from this
   * rather than capturing `new Date()` once at construction, so a dashboard
   * left open overnight stops saying "Good morning" at 9pm the moment
   * anything refreshes it.
   */
  readonly loadedAt = this._loadedAt.asReadonly();

  /** The one thing Kit is saying right now — highest rank, server-ordered. */
  readonly topEvent = computed(() => this._events()[0] ?? null);

  /** Everything behind the top item, for the quiet "N more" line. */
  readonly remainingCount = computed(() => Math.max(this._events().length - 1, 0));

  /** The rest, as their own entries — the dashboard shows them as chips. */
  readonly restEvents = computed(() => this._events().slice(1));

  /**
   * Findings the user closed that are still true.
   *
   * Loaded alongside the active ones because they change what Kit is allowed
   * to say: "all caught up" over seven items somebody clicked away without
   * acting on is a lie, and the only way to know is to have counted them.
   */
  readonly setAside = this._setAside.asReadonly();
  readonly setAsideCount = computed(() => this._setAside().length);

  /** True only when there is genuinely nothing left — active or set aside. */
  readonly allClear = computed(
    () => this._events().length === 0 && this._setAside().length === 0,
  );

  readonly mood = computed<KitMood>(() => {
    // Celebrating outranks loading: recording a payment reloads the dashboard,
    // and Kit shouldn't drop out of a celebration to look busy.
    if (this._celebrating()) return 'happy';
    if (this._loading()) return 'thinking';

    const top = this.topEvent();
    if (!top) return 'happy';
    if (top.severity === 'URGENT') return 'sad';
    if (top.severity === 'WARNING') return 'concern';
    return 'neutral';
  });

  readonly celebrating = this._celebrating.asReadonly();

  load(): void {
    this._loading.set(true);
    this._loadedAt.set(new Date());
    this.http.get<KitEvent[]>(`${this.base}/events`).subscribe({
      next: (events) => {
        this._events.set(events);
        this._loading.set(false);
      },
      // Kit is decorative infrastructure — a failed fetch must never break the
      // dashboard. Fall silent instead.
      error: () => {
        this._events.set([]);
        this._loading.set(false);
      },
    });

    // Separate request, and deliberately not awaited alongside the first: the
    // card renders on the active list, and this only decides whether its quiet
    // state is allowed to claim everything is done.
    this.http.get<KitEvent[]>(`${this.base}/events/set-aside`).subscribe({
      next: (events) => this._setAside.set(events),
      error: () => this._setAside.set([]),
    });
  }

  /**
   * Optimistic: the card leaves immediately, and comes back if the call fails.
   * It moves to the set-aside list rather than vanishing — dismissing is now
   * "not now", and Kit has to keep being able to say so.
   */
  dismiss(event: KitEvent): void {
    const active = this._events();
    const aside = this._setAside();
    this._events.set(active.filter((candidate) => candidate.id !== event.id));
    this._setAside.set([event, ...aside]);

    this.http.patch<KitEvent>(`${this.base}/events/${event.id}/dismiss`, {}).subscribe({
      error: () => {
        this._events.set(active);
        this._setAside.set(aside);
      },
    });
  }

  /**
   * Brings a set-aside finding back.
   *
   * Re-sorted by rank on the way in rather than pushed to the front: the list
   * is a priority order, and a restored urgent item belongs at the top of it,
   * not wherever the user happened to click.
   */
  restore(event: KitEvent): void {
    const active = this._events();
    const aside = this._setAside();
    this._events.set([...active, event].sort((a, b) => severityRank(b) - severityRank(a)));
    this._setAside.set(aside.filter((candidate) => candidate.id !== event.id));

    this.http.patch<KitEvent>(`${this.base}/events/${event.id}/restore`, {}).subscribe({
      error: () => {
        this._events.set(active);
        this._setAside.set(aside);
      },
    });
  }

  /** Kit's reaction to a payment being recorded. Transient, never stored. */
  celebrate(): void {
    clearTimeout(this.celebrationTimer);
    this._celebrating.set(true);
    this.celebrationTimer = setTimeout(() => this._celebrating.set(false), CELEBRATION_MS);
  }
}
