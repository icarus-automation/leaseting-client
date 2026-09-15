import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Subscription } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api';
import type { Paginated } from '../models/api.types';

interface OpenCount {
  /** The session user the number was read for. */
  userId: string;
  count: number;
}

/**
 * How many maintenance requests in the organization are Open: the number on
 * the Work Orders item in the sidebar.
 *
 * It is read the way the API contract describes, as a one-row page filtered to
 * OPEN with the answer in `meta.total`. The sidebar asks again on every
 * navigation, which the GET cache folds into one request per 20 seconds.
 *
 * A number only shows for the user it was read for. Signing out and back in as
 * someone else on a shared machine never flashes the last person's count.
 */
@Injectable({ providedIn: 'root' })
export class OpenRequestsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly latest = signal<OpenCount | null>(null);
  private inFlight: Subscription | null = null;

  /** Open requests for the signed-in user's organization, or null while unknown. */
  readonly count = computed(() => {
    const latest = this.latest();
    return latest && latest.userId === this.auth.currentUser()?.id ? latest.count : null;
  });

  refresh(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.inFlight?.unsubscribe();
    const params = new HttpParams().set('page', 1).set('limit', 1).set('status', 'OPEN');
    this.inFlight = this.http
      .get<Paginated<unknown>>(`${API_BASE_URL}/maintenance-requests`, { params })
      .subscribe({
        next: (page) => this.latest.set({ userId, count: page.meta.total }),
        // A number that could not be read is worse than none: hide it until a read works.
        error: () => this.latest.set(null),
      });
  }
}
