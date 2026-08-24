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
import { ConfirmationService, MessageService } from 'primeng/api';
import { take, takeWhile, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import type { KitMood } from '../../core/kit/kit.model';
import { apiErrorMessage } from '../../core/models/api.types';
import { KitHead } from '../../shared/ui/kit/kit-head';
import { KitDocumentCard } from './components/kit-document-card/kit-document-card';
import { KitMarkdown } from './components/kit-markdown/kit-markdown';
import type { KitChatMessage, KitConversationSummary, KitDocumentTurn } from './kit-chat.types';
import { splitCommand, toMessageView } from './kit-command.util';
import { KitChatService } from './services/kit-chat.service';

/**
 * Openers for the blank state. A general-purpose assistant with an empty box
 * is a hard thing to start using — these show what Kit is actually good for,
 * one from each side of it: their own records, and everything else.
 *
 * The `/document` opener leads deliberately. It is the one thing here nobody
 * discovers by typing, because it needs a trigger word to exist at all — a
 * feature reachable only by knowing a magic word is, for most users, a feature
 * that does not exist. Showing it first and letting it render its own trigger
 * teaches the syntax by example rather than by instruction.
 */
const SUGGESTIONS = [
  '/document a list of unpaid tenants with their contact numbers',
  'Who has an unpaid balance right now?',
  'Which leases end in the next 90 days?',
  'Draft a polite reminder for a tenant who is two weeks late on rent.',
];

/**
 * Polling cadence for a generating document.
 *
 * The ceiling deliberately outlasts the server's own three-minute cutoff, so
 * the last poll reads the FAILED it writes rather than the card spinning on
 * past it forever.
 */
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
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transcript = viewChild<ElementRef<HTMLDivElement>>('transcript');
  private readonly highlight = viewChild<ElementRef<HTMLDivElement>>('highlight');

  /**
   * Openers pre-split, so a suggestion carrying `/document` renders the
   * trigger in the same styling the composer and the transcript give it. One
   * splitter, three places: the user sees the same token everywhere it means
   * the same thing.
   */
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

  /** The transcript with each turn's command split out so it can be styled. */
  readonly view = computed(() => this.messages().map(toMessageView));

  /** The draft split the same way, for the composer's highlight overlay. */
  readonly draftParts = computed(() => splitCommand(this.draft()));

  /** Flags the composer while the draft is a document request. */
  readonly isDocumentDraft = computed(() => this.draftParts().command !== null);

  /** Documents already being watched, so a re-render cannot double-poll. */
  private readonly watched = new Set<string>();

  constructor() {
    this.refreshHistory();

    // /kit and /kit/:id share this component, so Angular reuses the instance
    // and the param stream is what tells us the thread changed. Driving off
    // the URL keeps back/forward and deep links working for free.
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.openFromRoute(params.get('id')));

    // Keep the newest turn in view without yanking the page around mid-read:
    // this only runs when the transcript actually changes.
    effect(() => {
      this.messages();
      this.pending();
      const element = this.transcript()?.nativeElement;
      if (element) queueMicrotask(() => element.scrollTo({ top: element.scrollHeight }));
    });
  }

  /** Called by the template whenever the :id segment changes. */
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
          // A thread reopened mid-generation still has work in flight.
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

  /**
   * Scrolls the styled copy in step with the field it sits on top of. Only
   * bites once a draft outgrows the composer, but without it the highlight
   * slides off the text it belongs to.
   */
  syncHighlight(event: Event): void {
    const overlay = this.highlight()?.nativeElement;
    if (overlay) overlay.scrollTop = (event.target as HTMLTextAreaElement).scrollTop;
  }

  /** Enter sends; Shift+Enter is a newline, which longer questions need. */
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
    // Optimistic bubble so the question appears the instant it is asked.
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
          // replaceState rather than router.navigate: /kit and /kit/:id are two
          // route entries pointing at this component, so routing between them
          // destroys and rebuilds the whole view — which is the flash the user
          // sees the instant their first message lands. The URL still needs to
          // become deep-linkable, so update the address bar without routing.
          // The blank page was never a destination worth going back to, so
          // replace rather than push.
          this.location.replaceState(`/kit/${conversation.id}`);
        },
        error: (error: unknown) => this.failSend(error, content, optimistic.id),
      });
  }

  remove(conversation: KitConversationSummary, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.confirmation.confirm({
      header: 'Delete conversation',
      message: `"${conversation.title}" will be permanently removed. This cannot be undone.`,
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
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

  /**
   * Starts a poll for every document still generating in the open thread.
   * Safe to call after any transcript change — `watched` makes it idempotent.
   */
  private watchPendingDocuments(): void {
    for (const message of this.messages()) {
      const document = message.document;
      if (document?.status === 'PENDING' && !this.watched.has(document.id)) {
        this.watch(document.id);
      }
    }
  }

  /**
   * Polls one document until it is no longer pending.
   *
   * `takeWhile(..., true)` keeps the terminal reading, which is the one that
   * carries the finished file — dropping it would leave the card stuck on the
   * last "still working" answer.
   */
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
        // A dropped poll is not worth a toast: the card keeps its last state
        // and reopening the conversation picks the document up again.
        error: () => this.watched.delete(documentId),
        complete: () => this.watched.delete(documentId),
      });
  }

  /**
   * A refinement produced a new turn. Appended and watched exactly like any
   * other document request, because on the server it is one.
   */
  onRefined(message: KitChatMessage): void {
    this.messages.update((messages) => [...messages, message]);
    this.refreshHistory();
    this.watchPendingDocuments();
  }

  /** Replaces the turn in place, keeping its position in the transcript. */
  private applyDocumentTurn(turn: KitDocumentTurn): void {
    this.messages.update((messages) =>
      messages.map((message) =>
        message.id === turn.messageId
          ? { ...message, content: turn.content, document: turn.document }
          : message,
      ),
    );
  }

  /** Hands the question back rather than swallowing it into a failed send. */
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
