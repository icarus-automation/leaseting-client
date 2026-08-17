import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'll.report-favorites';

/**
 * Starred reports, kept in this browser.
 *
 * Deliberately client-side: there is no user-preferences table yet, and a
 * migration is a steep price for a bookmark. The storage call is the only
 * thing that would change if favorites move server-side later — every consumer
 * talks to the signal, not to localStorage.
 *
 * Reads and writes are guarded because storage throws in private-mode Safari
 * and when a quota is exhausted. Losing a bookmark is acceptable; taking the
 * reports page down over one is not.
 */
@Injectable({ providedIn: 'root' })
export class ReportFavoritesService {
  private readonly keys = signal<ReadonlySet<string>>(readStored());

  readonly favorites = this.keys.asReadonly();
  readonly count = computed(() => this.keys().size);

  isFavorite(key: string): boolean {
    return this.keys().has(key);
  }

  toggle(key: string): void {
    this.keys.update((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      persist(next);
      return next;
    });
  }
}

function readStored(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((key): key is string => typeof key === 'string'));
  } catch {
    return new Set();
  }
}

function persist(keys: ReadonlySet<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Storage unavailable or full — favorites stay in memory for this session.
  }
}
