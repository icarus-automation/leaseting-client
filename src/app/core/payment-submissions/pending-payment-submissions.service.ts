import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Subscription } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api';

interface PendingCount {
  userId: string;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class PendingPaymentSubmissionsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly latest = signal<PendingCount | null>(null);
  private inFlight: Subscription | null = null;

  readonly count = computed(() => {
    const latest = this.latest();
    return latest && latest.userId === this.auth.currentUser()?.id ? latest.count : null;
  });

  refresh(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    this.inFlight?.unsubscribe();
    this.inFlight = this.http
      .get<{ pendingCount: number }>(`${API_BASE_URL}/payment-submissions/pending-count`)
      .subscribe({
        next: ({ pendingCount }) => this.latest.set({ userId, count: pendingCount }),
        error: () => this.latest.set(null),
      });
  }
}
