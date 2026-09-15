import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import type { Subscription } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api';

interface PendingCount {
  /** The session user the number was read for. */
  userId: string;
  count: number;
}

/**
 * Pending Residence Care payment submissions for the signed-in organization.
 * The sidebar refreshes it on navigation, and the review queue refreshes it
 * after an approval or rejection so both surfaces keep the same number.
 *
 * A number only shows for the user it was read for. Signing out and back in as
 * someone else on a shared machine never flashes the last person's count.
 */
@Injectable({ providedIn: 'root' })
export class PendingPaymentSubmissionsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  private readonly latest = signal<PendingCount | null>(null);
  private inFlight: Subscription | null = null;

  /** Pending submissions for the current user, or null while unknown. */
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
        // A number that could not be read is worse than none: hide it until a read works.
        error: () => this.latest.set(null),
      });
  }
}
