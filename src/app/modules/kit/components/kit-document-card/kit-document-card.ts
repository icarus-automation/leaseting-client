import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { KitChatMessage, KitDocument } from '../../kit-chat.types';
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
  private readonly toast = inject(MessageService);
  private readonly field = viewChild<ElementRef<HTMLInputElement>>('refineField');

  readonly document = input.required<KitDocument>();

  /** The new turn a refinement produced, for the transcript to append. */
  readonly refined = output<KitChatMessage>();

  private readonly now = signal(Date.now());

  readonly refining = signal(false);
  readonly refinement = signal('');
  readonly sending = signal(false);

  readonly canRefine = computed(() => this.refinement().trim().length > 0 && !this.sending());

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

    // Focus follows the disclosure, or the user has to hunt for the field they
    // just opened. Deferred a tick because the input does not exist until this
    // effect's own signal read has re-rendered the template.
    effect(() => {
      if (this.refining()) queueMicrotask(() => this.field()?.nativeElement.focus());
    });
  }

  toggleRefine(): void {
    this.refining.update((open) => !open);
  }

  cancelRefine(): void {
    this.refining.set(false);
    this.refinement.set('');
  }

  /**
   * Sends the change. The server joins it to the original request, so the user
   * types only what is different — which is the whole point: the revision cost
   * being complained about was retyping a sentence to move one column.
   */
  submitRefine(): void {
    const content = this.refinement().trim();
    if (!content || this.sending()) return;

    this.sending.set(true);
    this.chat
      .refineDocument(this.document().id, content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => {
          this.sending.set(false);
          this.cancelRefine();
          this.refined.emit(message);
        },
        // The draft is kept on failure: it is the only copy, and losing it is
        // worse than the failure itself.
        error: (error: unknown) => {
          this.sending.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not refine that',
            detail: apiErrorMessage(error),
          });
        },
      });
  }
}
