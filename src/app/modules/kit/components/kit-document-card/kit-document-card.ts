import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';

import type { KitDocument } from '../../kit-chat.types';
import { KitChatService } from '../../services/kit-chat.service';

/**
 * How often the card re-checks whether its download has lapsed. The server
 * holds files for 30 minutes, so half-minute granularity is plenty — this only
 * exists so a card left open on screen stops offering a link that has died.
 */
const EXPIRY_TICK_MS = 30_000;

type CardState = 'pending' | 'ready' | 'expired' | 'failed';

@Component({
  selector: 'app-kit-document-card',
  imports: [DatePipe, PIcon],
  templateUrl: './kit-document-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitDocumentCard {
  private readonly chat = inject(KitChatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly document = input.required<KitDocument>();

  private readonly now = signal(Date.now());

  readonly state = computed<CardState>(() => {
    const document = this.document();
    if (document.status === 'FAILED') return 'failed';
    if (document.status === 'PENDING') return 'pending';
    return Date.parse(document.expiresAt) <= this.now() ? 'expired' : 'ready';
  });

  /** "PDF" / "XLSX", or nothing while Kit is still deciding. */
  readonly formatLabel = computed(() => this.document().format ?? '');

  readonly icon = computed(() => (this.document().format === 'XLSX' ? 'file-excel' : 'file-pdf'));

  readonly downloadUrl = computed(() => this.chat.downloadUrl(this.document().id));

  readonly downloadLabel = computed(() => `Download ${this.document().fileName ?? this.document().title}`);

  constructor() {
    interval(EXPIRY_TICK_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }
}
