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
import { Subscription, take, takeWhile, timer } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';

import type { KitMood } from '../../core/kit/kit.model';
import { apiErrorMessage } from '../../core/models/api.types';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { KitHead } from '../../shared/ui/kit/kit-head';
import { KitDocumentCard } from './components/kit-document-card/kit-document-card';
import { KitMarkdown } from './components/kit-markdown/kit-markdown';
import type { KitChatMessage, KitConversationSummary, KitDocumentTurn } from './kit-chat.types';
import { splitCommand, toMessageView } from './kit-command.util';
import type { KitStreamEvent } from './kit-stream.types';
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

  readonly showThinking = computed(() => {
    if (!this.pending()) return false;
    const last = this.messages().at(-1);
    return last?.role !== 'ASSISTANT' || last.content.length === 0;
  });

  private readonly watched = new Set<string>();
  private streamSub?: Subscription;
  private inFlightUserId: string | null = null;
  private inFlightAssistantId: string | null = null;

  constructor() {
    this.refreshHistory();

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.openFromRoute(params.get('id')));

    effect(() => {
      this.messages();
      this.pending();
      const element = this.transcript()?.nativeElement;
      if (!element || typeof element.scrollTo !== 'function') return;
      queueMicrotask(() => element.scrollTo({ top: element.scrollHeight }));
    });
  }

  openFromRoute(id: string | null): void {
    if (id === this.activeId()) return;
    this.abandonStream();
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

    const now = new Date().toISOString();
    const user: KitChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: now,
    };
    const assistant: KitChatMessage = {
      id: `pending-assistant-${Date.now()}`,
      role: 'ASSISTANT',
      content: '',
      createdAt: now,
    };
    this.inFlightUserId = user.id;
    this.inFlightAssistantId = assistant.id;
    this.messages.update((messages) => [...messages, user, assistant]);

    const id = this.activeId();
    const stream$ = id ? this.chat.streamFollowUp(id, content) : this.chat.streamStart(content);
    this.streamSub = stream$
      .pipe(
        finalize(() => this.dropAbandonedTurn()),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (event) => this.applyStream(event),
        error: (error: unknown) => this.failSend(error, content),
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

  private applyStream(event: KitStreamEvent): void {
    if (event.type === 'started') {
      this.bindConversation(event.conversationId);
      if (event.userMessage) this.takeServerUser(event.userMessage);
      this.refreshHistory();
      return;
    }

    if (event.type === 'delta') {
      const id = this.inFlightAssistantId;
      if (!id || !event.text) return;
      this.messages.update((messages) =>
        messages.map((message) =>
          message.id === id ? { ...message, content: message.content + event.text } : message,
        ),
      );
      return;
    }

    this.bindConversation(event.conversationId);
    if (event.conversation) {
      this.messages.set(event.conversation.messages);
    } else {
      if (event.userMessage) this.takeServerUser(event.userMessage);
      this.takeServerAssistant(event.message);
    }
    this.pending.set(false);
    this.clearInFlight();
    this.refreshHistory();
    this.watchPendingDocuments();
  }

  private bindConversation(conversationId: string): void {
    if (this.activeId() === conversationId) return;
    this.activeId.set(conversationId);
    this.location.replaceState(`/kit/${conversationId}`);
  }

  private takeServerUser(user: KitChatMessage): void {
    const id = this.inFlightUserId;
    if (!id) return;
    this.replaceMessage(id, user);
    this.inFlightUserId = user.id;
  }

  private takeServerAssistant(message: KitChatMessage): void {
    const id = this.inFlightAssistantId;
    if (!id) return;
    const current = this.messages().find((candidate) => candidate.id === id);
    this.replaceMessage(id, {
      ...message,
      content: message.content || current?.content || '',
      document: message.document ?? current?.document,
    });
    this.inFlightAssistantId = message.id;
  }

  private replaceMessage(id: string, next: KitChatMessage): void {
    this.messages.update((messages) =>
      messages.map((message) => (message.id === id ? next : message)),
    );
  }

  private abandonStream(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = undefined;
  }

  private dropAbandonedTurn(): void {
    if (!this.pending()) return;
    this.dropInFlight();
    this.pending.set(false);
    this.clearInFlight();
  }

  private dropInFlight(): void {
    const userId = this.inFlightUserId;
    const assistantId = this.inFlightAssistantId;
    this.messages.update((messages) =>
      messages.filter((message) => message.id !== userId && message.id !== assistantId),
    );
  }

  private clearInFlight(): void {
    this.inFlightUserId = null;
    this.inFlightAssistantId = null;
    this.streamSub = undefined;
  }

  private failSend(error: unknown, content: string): void {
    this.pending.set(false);
    this.dropInFlight();
    this.clearInFlight();
    this.draft.set(content);
    this.toast.add({
      severity: 'error',
      summary: 'Kit could not reply',
      detail: apiErrorMessage(error),
    });
  }
}
