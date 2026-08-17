import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from '../config/api';
import type { KitEvent, KitMood } from './kit.model';

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
  }

  /** Optimistic: the card leaves immediately, and comes back if the call fails. */
  dismiss(event: KitEvent): void {
    const previous = this._events();
    this._events.set(previous.filter((candidate) => candidate.id !== event.id));

    this.http.patch<KitEvent>(`${this.base}/events/${event.id}/dismiss`, {}).subscribe({
      error: () => this._events.set(previous),
    });
  }

  /** Kit's reaction to a payment being recorded. Transient, never stored. */
  celebrate(): void {
    clearTimeout(this.celebrationTimer);
    this._celebrating.set(true);
    this.celebrationTimer = setTimeout(() => this._celebrating.set(false), CELEBRATION_MS);
  }
}
