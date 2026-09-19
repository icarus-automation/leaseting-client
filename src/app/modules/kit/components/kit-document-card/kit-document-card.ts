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

  readonly formatLabel = computed(() => this.document().format ?? '');

  readonly icon = computed(() => (this.document().format === 'XLSX' ? 'file-excel' : 'file-pdf'));

  readonly downloadUrl = computed(() => this.chat.downloadUrl(this.document().id));

  readonly downloadLabel = computed(() => `Download ${this.document().fileName ?? this.document().title}`);

  constructor() {
    interval(EXPIRY_TICK_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));

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
