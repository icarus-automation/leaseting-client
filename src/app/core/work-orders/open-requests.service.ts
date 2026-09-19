import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Subscription } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api';
import type { Paginated } from '../models/api.types';

interface OpenCount {
  userId: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class OpenRequestsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly latest = signal<OpenCount | null>(null);
  private inFlight: Subscription | null = null;

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
        error: () => this.latest.set(null),
      });
  }
}
