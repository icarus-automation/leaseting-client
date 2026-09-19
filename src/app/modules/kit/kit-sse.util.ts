import type { KitChatMessage, KitDocument } from './kit-chat.types';
import type { KitSseFrame, KitStreamEvent } from './kit-stream.types';

export function splitSseFrames(buffer: string): { frames: KitSseFrame[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split('\n\n');
  const rest = blocks.pop() ?? '';
  return { frames: blocks.flatMap(parseSseBlock), rest };
}

export function parseSseBlock(block: string): KitSseFrame[] {
  let event = 'message';
  const data: string[] = [];

  for (const rawLine of block.split('\n')) {
    const raw = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
    if (!raw || raw.startsWith(':')) continue;
    const separator = raw.indexOf(':');
    const field = separator === -1 ? raw : raw.slice(0, separator);
    let value = separator === -1 ? '' : raw.slice(separator + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    if (field === 'data') data.push(value);
  }

  if (data.length === 0) return [];
  return [{ event, data: data.join('\n') }];
}

export function decodeKitSseFrame(
  frame: KitSseFrame,
): { event: KitStreamEvent } | { error: string } | null {
  if (frame.event === 'error') {
    return { error: readErrorMessage(parseJson(frame.data)) };
  }

  if (frame.event !== 'started' && frame.event !== 'delta' && frame.event !== 'done') {
    return null;
  }

  const payload = parseJson(frame.data);
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { error: 'Kit sent a reply Kit could not read.' };
  }

  const data = payload as Record<string, unknown>;

  if (frame.event === 'delta') {
    if (typeof data['text'] !== 'string') return { error: 'Kit sent a reply Kit could not read.' };
    return { event: { type: 'delta', text: data['text'] } };
  }

  if (frame.event === 'started') {
    const conversationId =
      typeof data['conversationId'] === 'string' ? data['conversationId'] : undefined;
    return conversationId
      ? { event: { type: 'started', conversationId } }
      : { event: { type: 'started' } };
  }

  if (data['status'] !== 'complete') {
    return { error: readErrorMessage(payload) };
  }

  if (typeof data['conversationId'] !== 'string' || !data['conversationId']) {
    return { error: 'Kit sent a reply Kit could not read.' };
  }

  const message = readMessage(data['message']);
  if (!message) return { error: 'Kit sent a reply Kit could not read.' };

  return {
    event: {
      type: 'done',
      status: 'complete',
      conversationId: data['conversationId'],
      message,
    },
  };
}

function parseJson(raw: string): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function readMessage(value: unknown): KitChatMessage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const message = value as Record<string, unknown>;
  if (typeof message['id'] !== 'string' || typeof message['content'] !== 'string') return null;
  if (message['role'] !== 'USER' && message['role'] !== 'ASSISTANT') return null;
  if (typeof message['createdAt'] !== 'string') return null;
  const read: KitChatMessage = {
    id: message['id'],
    role: message['role'],
    content: message['content'],
    createdAt: message['createdAt'],
  };
  const document = readDocument(message['document']);
  if (document) read.document = document;
  return read;
}

function readDocument(value: unknown): KitDocument | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const document = value as Record<string, unknown>;
  if (typeof document['id'] !== 'string' || typeof document['title'] !== 'string') return null;
  if (
    document['status'] !== 'PENDING' &&
    document['status'] !== 'READY' &&
    document['status'] !== 'FAILED'
  ) {
    return null;
  }
  return {
    id: document['id'],
    status: document['status'],
    format: document['format'] === 'PDF' || document['format'] === 'XLSX' ? document['format'] : null,
    title: document['title'],
    fileName: typeof document['fileName'] === 'string' ? document['fileName'] : null,
    error: typeof document['error'] === 'string' ? document['error'] : null,
    expiresAt: typeof document['expiresAt'] === 'string' ? document['expiresAt'] : '',
  };
}

function readErrorMessage(value: unknown): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Kit could not finish that reply.';
}
