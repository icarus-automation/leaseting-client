import { decodeKitSseFrame, parseSseBlock, splitSseFrames } from './kit-sse.util';

function framesFrom(chunks: string[]): ReturnType<typeof decodeKitSseFrame>[] {
  let buffer = '';
  const decoded: ReturnType<typeof decodeKitSseFrame>[] = [];
  for (const chunk of chunks) {
    buffer += chunk;
    const split = splitSseFrames(buffer);
    buffer = split.rest;
    for (const frame of split.frames) decoded.push(decodeKitSseFrame(frame));
  }
  const tail = splitSseFrames(buffer + '\n\n');
  for (const frame of tail.frames) decoded.push(decodeKitSseFrame(frame));
  return decoded;
}

describe('Ask Kit SSE framing', () => {
  it('appends mocked delta chunks in the order they arrive, even when split mid-event', () => {
    const decoded = framesFrom([
      'event: started\ndata: {"conversationId":"c1"}\n\n',
      'event: del',
      'ta\ndata: {"text":"Tenants with a balance: "}\n\n',
      'event: delta\ndata: {"text":"Mina ',
      'Santos (₱2,400)"}\n\n',
      'event: done\ndata: {"status":"complete","conversationId":"c1","message":{"id":"a1","role":"ASSISTANT","content":"Tenants with a balance: Mina Santos (₱2,400)","createdAt":"2026-09-19T00:00:00.000Z"}}\n\n',
    ]);

    const deltas = decoded.flatMap((item) =>
      item && 'event' in item && item.event.type === 'delta' ? [item.event.text] : [],
    );
    expect(deltas).toEqual(['Tenants with a balance: ', 'Mina Santos (₱2,400)']);
    expect(deltas.join('')).toBe('Tenants with a balance: Mina Santos (₱2,400)');

    const done = decoded.at(-1);
    expect(done && 'event' in done && done.event.type === 'done' && done.event.status).toBe(
      'complete',
    );
  });

  it('reads CR-LF framed events and ignores comment lines', () => {
    const [frame] = parseSseBlock(': keep-alive\r\nevent: delta\r\ndata: {"text":"Hi"}\r');
    expect(decodeKitSseFrame(frame)).toEqual({ event: { type: 'delta', text: 'Hi' } });
  });

  it('accepts a started event without extra fields', () => {
    const [frame] = parseSseBlock('event: started\ndata: {}');
    expect(decodeKitSseFrame(frame)).toEqual({ event: { type: 'started' } });
  });

  it('does not invent assistantMessage as a done field', () => {
    const [frame] = parseSseBlock(
      'event: done\ndata: {"status":"complete","conversationId":"c1","assistantMessage":{"id":"a1","role":"ASSISTANT","content":"nope","createdAt":"2026-09-19T00:00:00.000Z"}}',
    );
    expect(decodeKitSseFrame(frame)).toEqual({ error: 'Kit sent a reply Kit could not read.' });
  });

  it('reads a new-thread done event that carries conversation, not conversationId plus message', () => {
    const [frame] = parseSseBlock(
      'event: done\ndata: {"status":"complete","conversation":{"id":"3c2d1b0a-9f8e-7d6c-5b4a-3210fedcba98","title":"How do I record a partial payment?","updatedAt":"2026-09-19T19:12:03.104Z","messages":[{"id":"11111111-1111-1111-1111-111111111111","role":"USER","content":"How do I record a partial payment?","createdAt":"2026-09-19T19:12:03.080Z"},{"id":"22222222-2222-2222-2222-222222222222","role":"ASSISTANT","content":"Partial payments go on the bill itself. Open the bill and record what came in.","createdAt":"2026-09-19T19:12:03.095Z"}]}}',
    );
    expect(decodeKitSseFrame(frame)).toEqual({
      event: {
        type: 'done',
        status: 'complete',
        conversationId: '3c2d1b0a-9f8e-7d6c-5b4a-3210fedcba98',
        message: {
          id: '22222222-2222-2222-2222-222222222222',
          role: 'ASSISTANT',
          content: 'Partial payments go on the bill itself. Open the bill and record what came in.',
          createdAt: '2026-09-19T19:12:03.095Z',
        },
      },
    });
  });

  it('reads a follow-up done event that carries message and omits conversationId', () => {
    const [frame] = parseSseBlock(
      'event: done\ndata: {"status":"complete","message":{"id":"a2","role":"ASSISTANT","content":"Unit 2 is current.","createdAt":"2026-09-19T00:00:00.000Z"}}',
    );
    expect(decodeKitSseFrame(frame)).toEqual({
      event: {
        type: 'done',
        status: 'complete',
        message: {
          id: 'a2',
          role: 'ASSISTANT',
          content: 'Unit 2 is current.',
          createdAt: '2026-09-19T00:00:00.000Z',
        },
      },
    });
  });

  it('surfaces an SSE error event as a readable failure', () => {
    const [frame] = parseSseBlock('event: error\ndata: {"message":"DeepSeek timed out"}');
    expect(decodeKitSseFrame(frame)).toEqual({ error: 'DeepSeek timed out' });
  });

  it('keeps a pending document on done when chat mode sent no deltas', () => {
    const [frame] = parseSseBlock(
      'event: done\ndata: {"status":"complete","conversationId":"c1","message":{"id":"a1","role":"ASSISTANT","content":"","createdAt":"2026-09-19T00:00:00.000Z","document":{"id":"d1","status":"PENDING","format":"XLSX","title":"Unpaid tenants","fileName":null,"error":null,"expiresAt":"2026-09-19T01:00:00.000Z"}}}',
    );
    const decoded = decodeKitSseFrame(frame);
    expect(decoded && 'event' in decoded && decoded.event.type === 'done').toBe(true);
    if (!decoded || !('event' in decoded) || decoded.event.type !== 'done') return;
    expect(decoded.event.message.document?.status).toBe('PENDING');
    expect(decoded.event.message.document?.id).toBe('d1');
  });
});
