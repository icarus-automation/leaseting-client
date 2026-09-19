import type { KitChatMessage, KitConversationDetail, KitDocument } from './kit-chat.types';
import type { KitSseDone, KitSseFrame, KitStreamEvent } from './kit-stream.types';

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

  const conversationId = readConversationId(data);
  if (!conversationId) return { error: 'Kit sent a reply Kit could not read.' };

  if (frame.event === 'started') {
    const userMessage = readMessage(data['userMessage']);
    return {
      event: userMessage
        ? { type: 'started', conversationId, userMessage }
        : { type: 'started', conversationId },
    };
  }

  if (data['status'] !== 'complete') {
    return { error: readErrorMessage(payload) };
  }

  const message = readDoneMessage(data);
  if (!message) return { error: 'Kit sent a reply Kit could not read.' };

  const done: KitSseDone = { status: 'complete', conversationId, message };
  const userMessage = readMessage(data['userMessage']);
  if (userMessage) done.userMessage = userMessage;
  const conversation = readConversation(data['conversation'], conversationId);
  if (conversation) done.conversation = conversation;
  return { event: { type: 'done', ...done } };
}

function parseJson(raw: string): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function readConversationId(data: Record<string, unknown>): string | null {
  if (typeof data['conversationId'] === 'string' && data['conversationId']) {
    return data['conversationId'];
  }
  const conversation = data['conversation'];
  if (conversation && typeof conversation === 'object' && !Array.isArray(conversation)) {
    const id = (conversation as { id?: unknown }).id;
    if (typeof id === 'string' && id) return id;
  }
  if (typeof data['id'] === 'string' && data['id'] && !readMessage(data)) {
    return data['id'];
  }
  return null;
}

function readDoneMessage(data: Record<string, unknown>): KitChatMessage | null {
  const direct = readMessage(data['message']) ?? readMessage(data['assistantMessage']);
  if (direct) return withDocument(direct, data['document']);

  const conversation = data['conversation'];
  if (conversation && typeof conversation === 'object' && !Array.isArray(conversation)) {
    const messages = (conversation as { messages?: unknown }).messages;
    if (Array.isArray(messages)) {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = readMessage(messages[index]);
        if (message?.role === 'ASSISTANT') return withDocument(message, data['document']);
      }
    }
  }

  const document = readDocument(data['document']);
  if (!document) return null;
  return {
    id: typeof data['messageId'] === 'string' ? data['messageId'] : `document-${document.id}`,
    role: 'ASSISTANT',
    content: typeof data['content'] === 'string' ? data['content'] : '',
    createdAt: new Date().toISOString(),
    document,
  };
}

function withDocument(message: KitChatMessage, candidate: unknown): KitChatMessage {
  if (message.document) return message;
  const document = readDocument(candidate);
  return document ? { ...message, document } : message;
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

function readConversation(value: unknown, conversationId: string): KitConversationDetail | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const conversation = value as Record<string, unknown>;
  if (!Array.isArray(conversation['messages'])) return null;
  const messages = conversation['messages']
    .map(readMessage)
    .filter((message): message is KitChatMessage => message !== null);
  return {
    id: typeof conversation['id'] === 'string' ? conversation['id'] : conversationId,
    title: typeof conversation['title'] === 'string' ? conversation['title'] : 'Ask Kit',
    updatedAt:
      typeof conversation['updatedAt'] === 'string'
        ? conversation['updatedAt']
        : new Date().toISOString(),
    messages,
  };
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
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
    if (Array.isArray(message) && typeof message[0] === 'string' && message[0]) return message[0];
  }
  return 'Kit could not finish that reply.';
}
