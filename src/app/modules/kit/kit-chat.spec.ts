import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';

import { KitChat } from './kit-chat';
import type { KitChatMessage, KitConversationDetail, KitDocument, KitDocumentTurn } from './kit-chat.types';
import type { KitStreamEvent } from './kit-stream.types';
import { KitChatService } from './services/kit-chat.service';

const pendingDocument: KitDocument = {
  id: 'doc-1',
  status: 'PENDING',
  format: 'XLSX',
  title: 'Unpaid tenants',
  fileName: null,
  error: null,
  expiresAt: '2027-09-20T00:00:00.000Z',
};

const assistant = (content: string, document?: KitDocument): KitChatMessage => ({
  id: 'a1',
  role: 'ASSISTANT',
  content,
  createdAt: '2026-09-19T00:00:00.000Z',
  document,
});

describe('KitChat streaming', () => {
  const api = {
    list: vi.fn(),
    get: vi.fn(),
    streamStart: vi.fn(),
    streamFollowUp: vi.fn(),
    pollDocument: vi.fn(),
    remove: vi.fn(),
    downloadUrl: vi.fn((id: string) => `http://localhost:8000/api/v1/kit/documents/${id}/download`),
  };

  let fixture: ComponentFixture<KitChat>;
  let component: KitChat;
  let start$: Subject<KitStreamEvent>;
  let followUp$: Subject<KitStreamEvent>;
  let toast: MessageService;

  beforeEach(async () => {
    start$ = new Subject<KitStreamEvent>();
    followUp$ = new Subject<KitStreamEvent>();
    api.list.mockReturnValue(of([]));
    api.get.mockReturnValue(of({ id: 'other', title: 'Other', updatedAt: '2026-09-19T00:00:00.000Z', messages: [] }));
    api.streamStart.mockReturnValue(start$.asObservable());
    api.streamFollowUp.mockReturnValue(followUp$.asObservable());
    api.pollDocument.mockReturnValue(of());

    await TestBed.configureTestingModule({
      imports: [KitChat],
      providers: [
        provideRouter([]),
        MessageService,
        ConfirmationService,
        { provide: KitChatService, useValue: api },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KitChat);
    component = fixture.componentInstance;
    toast = TestBed.inject(MessageService);
    vi.spyOn(toast, 'add');
    vi.spyOn(TestBed.inject(Location), 'replaceState');
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return host().textContent ?? '';
  }

  function send(question: string): void {
    component.draft.set(question);
    component.send();
    fixture.detectChanges();
  }

  function thinkingStatus(): HTMLElement | null {
    return host().querySelector('[aria-label="Kit is thinking"]');
  }

  function kitHeads(): NodeListOf<Element> {
    return host().querySelectorAll('app-kit-head');
  }

  it('shows one Kit avatar and a circular spinner while thinking', () => {
    send('Who has an unpaid balance right now?');

    const status = thinkingStatus();
    expect(status).not.toBeNull();
    expect(kitHeads()).toHaveLength(1);
    expect(status!.querySelectorAll('app-kit-head')).toHaveLength(1);
    expect(status!.querySelector('.animate-spinner')).not.toBeNull();
    expect(status!.textContent).toMatch(/Thinking/);
    expect(status!.textContent).not.toMatch(/Kit is thinking/);
    expect(status!.querySelector('details, [aria-expanded]')).toBeNull();
  });

  it('shows assistant text incrementally as delta events arrive', () => {
    send('Who has an unpaid balance right now?');
    expect(thinkingStatus()).not.toBeNull();
    expect(kitHeads()).toHaveLength(1);

    start$.next({ type: 'started', conversationId: 'c1' });
    start$.next({ type: 'delta', text: 'Mina ' });
    fixture.detectChanges();
    expect(text()).toContain('Mina');
    expect(thinkingStatus()).toBeNull();
    expect(kitHeads()).toHaveLength(1);

    start$.next({ type: 'delta', text: 'Santos is late.' });
    fixture.detectChanges();
    expect(text()).toContain('Mina Santos is late.');

    start$.next({
      type: 'done',
      status: 'complete',
      conversationId: 'c1',
      message: assistant('Mina Santos is late.'),
    });
    start$.complete();
    fixture.detectChanges();

    expect(component.pending()).toBe(false);
    expect(component.activeId()).toBe('c1');
    expect(TestBed.inject(Location).replaceState).toHaveBeenCalledWith('/kit/c1');
    expect(api.streamStart).toHaveBeenCalledWith('Who has an unpaid balance right now?');
  });

  it('binds the conversation from done when started omitted the id', () => {
    send('Who is late?');
    start$.next({ type: 'started' });
    start$.next({ type: 'delta', text: 'Mina is late.' });
    start$.next({
      type: 'done',
      status: 'complete',
      conversationId: 'c1',
      message: assistant('Mina is late.'),
    });
    start$.complete();
    fixture.detectChanges();

    expect(component.activeId()).toBe('c1');
    expect(component.pending()).toBe(false);
    expect(TestBed.inject(Location).replaceState).toHaveBeenCalledWith('/kit/c1');
  });

  it('sends follow-ups through the conversation message stream', () => {
    component.activeId.set('c1');
    send('What about unit 2?');

    expect(api.streamFollowUp).toHaveBeenCalledWith('c1', 'What about unit 2?');
    expect(api.streamStart).not.toHaveBeenCalled();
  });

  it('keeps the pending-document poll when done has no deltas', () => {
    vi.useFakeTimers();
    const ready: KitDocumentTurn = {
      messageId: 'a1',
      content: 'Spreadsheet is ready.',
      document: { ...pendingDocument, status: 'READY', fileName: 'unpaid.xlsx' },
    };
    api.pollDocument.mockReturnValue(of(ready));

    send('/document unpaid tenants');
    start$.next({ type: 'started', conversationId: 'c1' });
    expect(thinkingStatus()).not.toBeNull();
    expect(kitHeads()).toHaveLength(1);

    start$.next({
      type: 'done',
      status: 'complete',
      conversationId: 'c1',
      message: assistant('', pendingDocument),
    });
    start$.complete();
    fixture.detectChanges();

    expect(text()).toContain('Building your document…');
    expect(thinkingStatus()).toBeNull();
    expect(api.pollDocument).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2_000);
    fixture.detectChanges();

    expect(api.pollDocument).toHaveBeenCalledWith('doc-1');
    expect(text()).toContain('Unpaid tenants');
    expect(text()).toContain('unpaid.xlsx');
    expect(component.messages()[1]?.document?.status).toBe('READY');
  });

  it('drops a half-written turn when the stream is abandoned', () => {
    send('Long question');
    start$.next({ type: 'started', conversationId: 'c1' });
    start$.next({ type: 'delta', text: 'Half a thought' });
    fixture.detectChanges();
    expect(text()).toContain('Half a thought');

    const other: KitConversationDetail = {
      id: 'other',
      title: 'Other',
      updatedAt: '2026-09-19T00:00:00.000Z',
      messages: [],
    };
    api.get.mockReturnValue(of(other));
    component.openFromRoute('other');
    fixture.detectChanges();

    expect(component.pending()).toBe(false);
    expect(text()).not.toContain('Half a thought');
    expect(text()).not.toContain('Long question');
  });

  it.each([
    [401, 'Unauthorized'],
    [403, 'You do not have access.'],
    [404, 'Conversation not found'],
  ])('surfaces a pre-stream %s and restores the draft', (status, message) => {
    send('Who is late?');
    start$.error(new HttpErrorResponse({ status, error: { message } }));
    fixture.detectChanges();

    expect(component.pending()).toBe(false);
    expect(component.draft()).toBe('Who is late?');
    expect(component.messages()).toEqual([]);
    expect(toast.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Kit could not reply',
        detail: message,
      }),
    );
  });
});
