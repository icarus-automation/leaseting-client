import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { take, takeWhile, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type { KitMood } from '../../core/kit/kit.model';
import { apiErrorMessage } from '../../core/models/api.types';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { KitHead } from '../../shared/ui/kit/kit-head';
import { KitDocumentCard } from './components/kit-document-card/kit-document-card';
import { KitMarkdown } from './components/kit-markdown/kit-markdown';
import type { KitChatMessage, KitConversationSummary, KitDocumentTurn } from './kit-chat.types';
import { splitCommand, toMessageView } from './kit-command.util';
import { KitChatService } from './services/kit-chat.service';

const SUGGESTIONS = [
  '/document a list of unpaid tenants with their contact numbers',
  'Who has an unpaid balance right now?',
  'Which leases end in the next 90 days?',
  'Draft a polite reminder for a tenant who is two weeks late on rent.',
];

const POLL_INTERVAL_MS = 2_000;
const MAX_POLLS = 110;

@Component({
  selector: 'app-kit-chat',
  imports: [DatePipe, RouterLink, PIcon, KitHead, KitDocumentCard, KitMarkdown],
  templateUrl: './kit-chat.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitChat {
  private readonly chat = inject(KitChatService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly toast = inject(MessageService);
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transcript = viewChild<ElementRef<HTMLDivElement>>('transcript');
  private readonly highlight = viewChild<ElementRef<HTMLDivElement>>('highlight');

  readonly suggestions = SUGGESTIONS.map((text) => ({ text, ...splitCommand(text) }));

  readonly kitAvatarMood: KitMood = 'neutral';
  readonly kitThinkingMood: KitMood = 'thinking';

  readonly conversations = signal<KitConversationSummary[]>([]);
  readonly messages = signal<KitChatMessage[]>([]);
  readonly activeId = signal<string | null>(null);
  readonly draft = signal('');
  readonly pending = signal(false);
  readonly loadingThread = signal(false);
  readonly historyOpen = signal(false);

  readonly isBlank = computed(() => this.messages().length === 0 && !this.loadingThread());
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.pending());

  readonly view = computed(() => this.messages().map(toMessageView));

  readonly draftParts = computed(() => splitCommand(this.draft()));

  readonly isDocumentDraft = computed(() => this.draftParts().command !== null);

  private readonly watched = new Set<string>();

  constructor() {
    this.refreshHistory();

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.openFromRoute(params.get('id')));

    effect(() => {
      this.messages();
      this.pending();
      const element = this.transcript()?.nativeElement;
      if (element) queueMicrotask(() => element.scrollTo({ top: element.scrollHeight }));
    });
  }

  openFromRoute(id: string | null): void {
    if (id === this.activeId()) return;
    this.activeId.set(id);
    this.messages.set([]);
    if (!id) return;

    this.loadingThread.set(true);
    this.chat
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversation) => {
          this.messages.set(conversation.messages);
          this.loadingThread.set(false);
          this.watchPendingDocuments();
        },
        error: () => {
          this.loadingThread.set(false);
          this.toast.add({ severity: 'error', summary: 'That conversation is no longer available' });
          void this.router.navigate(['/kit']);
        },
      });
  }

  refreshHistory(): void {
    this.chat
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (items) => this.conversations.set(items), error: () => undefined });
  }

  useSuggestion(text: string): void {
    this.draft.set(text);
  }

  syncHighlight(event: Event): void {
    const overlay = this.highlight()?.nativeElement;
    if (overlay) overlay.scrollTop = (event.target as HTMLTextAreaElement).scrollTop;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    this.send();
  }

  send(): void {
    const content = this.draft().trim();
    if (!content || this.pending()) return;

    this.draft.set('');
    this.pending.set(true);
    const optimistic: KitChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    };
    this.messages.update((messages) => [...messages, optimistic]);

    const id = this.activeId();
    if (id) {
      this.chat
        .send(id, content)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (reply) => {
            this.messages.update((messages) => [...messages, reply]);
            this.pending.set(false);
            this.refreshHistory();
            this.watchPendingDocuments();
          },
          error: (error: unknown) => this.failSend(error, content, optimistic.id),
        });
      return;
    }

    this.chat
      .start(content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversation) => {
          this.pending.set(false);
          this.activeId.set(conversation.id);
          this.messages.set(conversation.messages);
          this.refreshHistory();
          this.watchPendingDocuments();
          this.location.replaceState(`/kit/${conversation.id}`);
        },
        error: (error: unknown) => this.failSend(error, content, optimistic.id),
      });
  }

  remove(conversation: KitConversationSummary, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.confirm.danger({
      header: 'Delete conversation',
      message: `"${conversation.title}" will be permanently removed. This cannot be undone.`,
      acceptLabel: 'Delete',
      onAccept: () => {
        this.chat
          .remove(conversation.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.conversations.update((items) => items.filter((item) => item.id !== conversation.id));
              if (this.activeId() === conversation.id) void this.router.navigate(['/kit']);
            },
            error: (error: unknown) =>
              this.toast.add({
                severity: 'error',
                summary: 'Could not delete',
                detail: apiErrorMessage(error),
              }),
          });
      },
    });
  }

  private watchPendingDocuments(): void {
    for (const message of this.messages()) {
      const document = message.document;
      if (document?.status === 'PENDING' && !this.watched.has(document.id)) {
        this.watch(document.id);
      }
    }
  }

  private watch(documentId: string): void {
    this.watched.add(documentId);

    timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.chat.pollDocument(documentId)),
        takeWhile((turn) => turn.document.status === 'PENDING', true),
        take(MAX_POLLS),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (turn) => this.applyDocumentTurn(turn),
        error: () => this.watched.delete(documentId),
        complete: () => this.watched.delete(documentId),
      });
  }

  onRefined(message: KitChatMessage): void {
    this.messages.update((messages) => [...messages, message]);
    this.refreshHistory();
    this.watchPendingDocuments();
  }

  private applyDocumentTurn(turn: KitDocumentTurn): void {
    this.messages.update((messages) =>
      messages.map((message) =>
        message.id === turn.messageId
          ? { ...message, content: turn.content, document: turn.document }
          : message,
      ),
    );
  }

  private failSend(error: unknown, content: string, optimisticId: string): void {
    this.pending.set(false);
    this.messages.update((messages) => messages.filter((message) => message.id !== optimisticId));
    this.draft.set(content);
    this.toast.add({
      severity: 'error',
      summary: 'Kit could not reply',
      detail: apiErrorMessage(error),
    });
  }
}
