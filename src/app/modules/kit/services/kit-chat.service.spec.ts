import { HttpErrorResponse } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom, toArray } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import { SKIP_CACHE_HEADER } from '../../../core/http/cache.interceptor';
import type { KitMentionOption } from '../kit-mention.util';
import type { KitStreamEvent } from '../kit-stream.types';
import { KitChatService } from './kit-chat.service';

const assistant = {
  id: 'a1',
  role: 'ASSISTANT' as const,
  content: 'Mina is late.',
  createdAt: '2026-09-19T00:00:00.000Z',
};

function sseBody(events: string[]): string {
  return `${events.join('\n\n')}\n\n`;
}

function sseResponse(events: string[]): Response {
  return new Response(sseBody(events), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function chunkedSse(parts: string[]): Response {
  const encoder = new TextEncoder();
  let index = 0;
  return new Response(
    new ReadableStream({
      pull(controller) {
        if (index < parts.length) {
          controller.enqueue(encoder.encode(parts[index]));
          index += 1;
          return;
        }
        controller.close();
      },
    }),
    { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
  );
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ statusCode: status, message, error: 'Error' }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('KitChatService streams', () => {
  let service: KitChatService;
  let fetchMock: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(KitChatService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts a conversation on POST /kit/conversations/stream with cookies', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: started\ndata: {"conversationId":"c1"}',
        'event: delta\ndata: {"text":"Mina "}',
        'event: delta\ndata: {"text":"is late."}',
        `event: done\ndata: ${JSON.stringify({ status: 'complete', conversationId: 'c1', message: assistant })}`,
      ]),
    );

    const events = await firstValueFrom(service.streamStart({ content: 'Who is late?', mentions: [] }).pipe(toArray()));

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/kit/conversations/stream`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ content: 'Who is late?' }),
      }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toEqual({
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    });
    expect(events.map((event) => event.type)).toEqual(['started', 'delta', 'delta', 'done']);
    expect(events.filter((event): event is Extract<KitStreamEvent, { type: 'delta' }> => event.type === 'delta').map((event) => event.text)).toEqual([
      'Mina ',
      'is late.',
    ]);
  });

  it('reads the API start-stream body that puts the thread on done.conversation', async () => {
    const conversation = {
      id: '3c2d1b0a-9f8e-7d6c-5b4a-3210fedcba98',
      title: 'How do I record a partial payment?',
      updatedAt: '2026-09-19T19:12:03.104Z',
      messages: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          role: 'USER' as const,
          content: 'How do I record a partial payment?',
          createdAt: '2026-09-19T19:12:03.080Z',
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          role: 'ASSISTANT' as const,
          content: 'Partial payments go on the bill itself. Open the bill and record what came in.',
          createdAt: '2026-09-19T19:12:03.095Z',
        },
      ],
    };
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: started\ndata: {"status":"started","mode":"chat"}',
        'event: delta\ndata: {"text":"Partial payments "}',
        `event: done\ndata: ${JSON.stringify({ status: 'complete', conversation })}`,
      ]),
    );

    const events = await firstValueFrom(service.streamStart({ content: 'How do I record a partial payment?', mentions: [] }).pipe(toArray()));
    const done = events.at(-1);

    expect(events.map((event) => event.type)).toEqual(['started', 'delta', 'done']);
    expect(done).toEqual({
      type: 'done',
      status: 'complete',
      conversationId: conversation.id,
      message: conversation.messages[1],
      messages: [conversation.messages[1]],
    });
  });

  it('sends follow-ups to /kit/conversations/:id/messages/stream', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: started\ndata: {"status":"started","mode":"chat","conversationId":"c1"}',
        `event: done\ndata: ${JSON.stringify({ status: 'complete', message: assistant })}`,
      ]),
    );

    await firstValueFrom(service.streamFollowUp('c1', { content: 'And unit 2?', mentions: [] }).pipe(toArray()));

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/kit/conversations/c1/messages/stream`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ content: 'And unit 2?' }),
      }),
    );
  });

  it('sends the picked tenant ids beside the message that names them', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([`event: done
data: ${JSON.stringify({ status: 'complete', message: assistant })}`]),
    );
    const content = 'Notice for @[Maria Santos](resident:c3a9d7e1-8b42-4f6c-a0d5-2e7b9c1f4a86)';

    await firstValueFrom(
      service.streamFollowUp('c1', { content, mentions: ['c3a9d7e1-8b42-4f6c-a0d5-2e7b9c1f4a86'] }).pipe(toArray()),
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      content,
      mentions: ['c3a9d7e1-8b42-4f6c-a0d5-2e7b9c1f4a86'],
    });
  });

  it('searches mentionable tenants on GET /kit/residents without the cache', () => {
    const http = TestBed.inject(HttpTestingController);
    const found: KitMentionOption[] = [];

    service.searchResidents('maria').subscribe((options) => found.push(...options));

    const request = http.expectOne((candidate) => candidate.url === `${API_BASE_URL}/kit/residents`);
    expect(request.request.params.get('search')).toBe('maria');
    expect(request.request.headers.has(SKIP_CACHE_HEADER)).toBe(true);
    request.flush([{ id: 'r1', name: 'Maria Santos', unitNo: 'A1', propertyName: 'Lakeview Residences' }]);
    expect(found.map((option) => option.unitNo)).toEqual(['A1']);
    http.verify();
  });

  it('appends mocked SSE delta chunks in order when the body arrives split', async () => {
    fetchMock.mockResolvedValue(
      chunkedSse([
        'event: started\ndata: {"conversationId":"c1"}\n\n',
        'event: delta\ndata: {"text":"One "}\n\n',
        'event: del',
        'ta\ndata: {"text":"two "}\n\n',
        `event: done\ndata: ${JSON.stringify({ status: 'complete', conversationId: 'c1', message: { ...assistant, content: 'One two ' } })}\n\n`,
      ]),
    );

    const events = await firstValueFrom(service.streamStart({ content: 'Long answer', mentions: [] }).pipe(toArray()));
    expect(
      events
        .filter((event): event is Extract<KitStreamEvent, { type: 'delta' }> => event.type === 'delta')
        .map((event) => event.text),
    ).toEqual(['One ', 'two ']);
  });

  it.each([
    [401, 'Unauthorized'],
    [403, 'Forbidden'],
    [404, 'Conversation not found'],
  ])('surfaces pre-stream %s as an error', async (status, message) => {
    fetchMock.mockResolvedValue(jsonError(status, message));

    const error = await firstValueFrom(service.streamStart({ content: 'Hello', mentions: [] }).pipe()).catch((caught) => caught);

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(status);
    expect((error as HttpErrorResponse).error).toEqual(
      expect.objectContaining({ message }),
    );
    expect(router.navigateByUrl).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
    if (status === 401) expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('does not error when the caller cancels mid-stream', async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    const events: KitStreamEvent[] = [];
    let failed: unknown;
    const sub = service.streamStart({ content: 'Cancel me', mentions: [] }).subscribe({
      next: (event) => events.push(event),
      error: (error) => {
        failed = error;
      },
    });
    sub.unsubscribe();
    await Promise.resolve();
    await Promise.resolve();

    expect(events).toEqual([]);
    expect(failed).toBeUndefined();
  });
});
