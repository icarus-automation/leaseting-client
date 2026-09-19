import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_BASE_URL } from '../config/api';
import type { KitEvent, KitMood, KitSeverity } from './kit.model';

const SEVERITY_RANK: Record<KitSeverity, number> = { URGENT: 3, WARNING: 2, INFO: 1 };

function severityRank(event: KitEvent): number {
  return SEVERITY_RANK[event.severity];
}

const CELEBRATION_MS = 2_500;

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

  readonly loadedAt = this._loadedAt.asReadonly();

  readonly topEvent = computed(() => this._events()[0] ?? null);

  readonly remainingCount = computed(() => Math.max(this._events().length - 1, 0));

  readonly restEvents = computed(() => this._events().slice(1));

  readonly setAside = this._setAside.asReadonly();
  readonly setAsideCount = computed(() => this._setAside().length);

  readonly allClear = computed(
    () => this._events().length === 0 && this._setAside().length === 0,
  );

  readonly mood = computed<KitMood>(() => {
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
      error: () => {
        this._events.set([]);
        this._loading.set(false);
      },
    });

    this.http.get<KitEvent[]>(`${this.base}/events/set-aside`).subscribe({
      next: (events) => this._setAside.set(events),
      error: () => this._setAside.set([]),
    });
  }

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

  celebrate(): void {
    clearTimeout(this.celebrationTimer);
    this._celebrating.set(true);
    this.celebrationTimer = setTimeout(() => this._celebrating.set(false), CELEBRATION_MS);
  }
}
