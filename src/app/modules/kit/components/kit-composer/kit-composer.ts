import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';

import {
  type DraftMention,
  type KitMentionOption,
  type KitTextSegment,
  MENTIONS_MAX,
  type MentionQuery,
  activeMentionQuery,
  draftSegments,
  insertMention,
  mentionedCount,
  reconcileMentions,
  removeMentionAt,
} from '../../kit-mention.util';
import { KitChatService } from '../../services/kit-chat.service';
import { KitMentionPicker } from '../kit-mention-picker/kit-mention-picker';

const SEARCH_DEBOUNCE_MS = 120;
const LIST_ID = 'kit-mention-list';

/** Each segment's look in the box behind the text. Color only: no padding or weight, so the caret stays in register. */
const OVERLAY_CLASS: Record<KitTextSegment['kind'], string> = {
  text: '',
  command: 'rounded-[3px] bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] font-semibold text-primary',
  mention:
    'rounded-[3px] bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary shadow-[0_0_0_2px_color-mix(in_oklab,var(--primary)_14%,transparent)]',
};

/**
 * Kit's message box. Type @ to pick a tenant from a list scoped to your
 * properties: the pick becomes a chip tied to the tenant's id, which is sent
 * with the message. Backspace against a chip removes it whole.
 */
@Component({
  selector: 'app-kit-composer',
  imports: [PIcon, KitMentionPicker],
  templateUrl: './kit-composer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitComposer {
  private readonly chat = inject(KitChatService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly field = viewChild.required<ElementRef<HTMLTextAreaElement>>('field');
  private readonly highlight = viewChild<ElementRef<HTMLDivElement>>('highlight');

  readonly draft = model('');
  readonly mentions = model<DraftMention[]>([]);
  readonly pending = input(false);
  readonly submitted = output<void>();

  readonly listId = LIST_ID;

  readonly query = signal<MentionQuery | null>(null);
  readonly options = signal<KitMentionOption[]>([]);
  readonly activeIndex = signal(0);
  readonly loading = signal(false);
  /** The last search failed, so an empty list says nothing about the tenants. */
  readonly searchFailed = signal(false);

  /** The `@` the user closed with Escape: it stays closed until they type a new one. */
  private dismissedAt: number | null = null;
  private readonly searches = new Subject<string>();

  readonly segments = computed(() => draftSegments({ text: this.draft(), mentions: this.mentions() }));
  readonly isDocumentDraft = computed(() => this.segments().some((segment) => segment.kind === 'command'));
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.pending());
  readonly limitReached = computed(() => mentionedCount(this.mentions()) >= MENTIONS_MAX);
  readonly pickerOpen = computed(() => this.query() !== null);
  readonly activeOptionId = computed(() =>
    this.pickerOpen() && !this.limitReached() && this.options().length > 0
      ? `${LIST_ID}-option-${this.activeIndex()}`
      : null,
  );
  readonly announcement = computed(() => {
    if (!this.pickerOpen() || this.loading()) return '';
    if (this.limitReached()) return `You can mention up to ${MENTIONS_MAX} tenants in one message.`;
    const count = this.options().length;
    if (this.searchFailed()) return 'Tenants could not be loaded.';
    if (count === 0) return 'No tenants match.';
    return `${count} ${count === 1 ? 'tenant' : 'tenants'} found. Use the up and down arrows, then Enter to pick.`;
  });

  constructor() {
    this.searches
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap((search) =>
          this.chat.searchResidents(search).pipe(
            map((options) => ({ search, options, failed: false })),
            catchError(() => of({ search, options: [] as KitMentionOption[], failed: true })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ search, options, failed }) => {
        if (this.query()?.query.trim() !== search) return;
        this.options.set(options);
        this.searchFailed.set(failed);
        this.activeIndex.set(0);
        this.loading.set(false);
      });
  }

  segmentClass(kind: KitTextSegment['kind']): string {
    return OVERLAY_CLASS[kind];
  }

  /** Puts text in the box from outside, such as a suggestion, and leaves the caret at the end. */
  focusEnd(): void {
    this.placeCaret(this.draft().length);
  }

  onInput(event: Event): void {
    const field = event.target as HTMLTextAreaElement;
    const next = field.value;
    const caret = field.selectionStart ?? next.length;
    this.mentions.set(reconcileMentions(this.draft(), next, caret, this.mentions()));
    this.draft.set(next);
    this.refreshQuery(caret);
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.handlePickerKey(event)) return;

    const field = event.target as HTMLTextAreaElement;
    if ((event.key === 'Backspace' || event.key === 'Delete') && field.selectionStart === field.selectionEnd) {
      const removed = removeMentionAt(
        { text: this.draft(), mentions: this.mentions() },
        field.selectionStart,
        event.key === 'Backspace' ? 'backward' : 'forward',
      );
      if (!removed) return;
      event.preventDefault();
      this.applyDraft(removed.text, removed.mentions, removed.caret);
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (this.canSend()) this.submitted.emit();
    }
  }

  /** Clicks and arrow keys move the caret into or out of an `@query`. */
  onCaretMove(): void {
    const field = this.field().nativeElement;
    if (field.selectionStart !== field.selectionEnd) {
      this.closePicker();
      return;
    }
    this.refreshQuery(field.selectionStart);
  }

  onBlur(): void {
    this.closePicker();
  }

  activate(index: number): void {
    this.activeIndex.set(index);
  }

  pick(option: KitMentionOption): void {
    const query = this.query();
    if (!query) return;
    const next = insertMention({ text: this.draft(), mentions: this.mentions() }, query, option);
    this.closePicker();
    this.applyDraft(next.text, next.mentions, next.caret);
  }

  syncHighlight(event: Event): void {
    const overlay = this.highlight()?.nativeElement;
    if (overlay) overlay.scrollTop = (event.target as HTMLTextAreaElement).scrollTop;
  }

  /** Arrow keys, Enter, Tab and Escape belong to the list while it is open. */
  private handlePickerKey(event: KeyboardEvent): boolean {
    if (!this.pickerOpen()) return false;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismissedAt = this.query()?.start ?? null;
      this.closePicker();
      return true;
    }

    const count = this.limitReached() ? 0 : this.options().length;
    if (count === 0) return false;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex.update((index) => (index + step + count) % count);
      return true;
    }
    if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
      event.preventDefault();
      this.pick(this.options()[Math.min(this.activeIndex(), count - 1)]);
      return true;
    }
    return false;
  }

  private refreshQuery(caret: number): void {
    const query = activeMentionQuery({ text: this.draft(), mentions: this.mentions() }, caret);
    if (!query || query.start === this.dismissedAt) {
      if (!query) this.dismissedAt = null;
      this.closePicker();
      return;
    }

    const previous = this.query();
    this.query.set(query);
    if (this.limitReached()) return;
    if (previous?.query.trim() === query.query.trim() && previous.start === query.start) return;
    this.loading.set(true);
    this.searches.next(query.query.trim());
  }

  private closePicker(): void {
    this.query.set(null);
    this.options.set([]);
    this.activeIndex.set(0);
    this.loading.set(false);
    this.searchFailed.set(false);
  }

  /**
   * Writes the box itself now, not only on the next render: a key pressed
   * right after a pick would otherwise edit the old text and its stale caret.
   * The binding later sets the same value, which leaves the caret alone.
   */
  private applyDraft(text: string, mentions: DraftMention[], caret: number): void {
    this.draft.set(text);
    this.mentions.set(mentions);
    const field = this.field().nativeElement;
    field.value = text;
    field.setSelectionRange(caret, caret);
    this.placeCaret(caret);
  }

  private placeCaret(caret: number): void {
    afterNextRender(
      {
        write: () => {
          const field = this.field().nativeElement;
          field.focus();
          field.setSelectionRange(caret, caret);
        },
      },
      { injector: this.injector },
    );
  }
}
