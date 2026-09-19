import type { KitChatMessage } from './kit-chat.types';
import { type MarkdownBlock, parseMarkdown } from './kit-markdown.util';

const COMMAND_PATTERN = /^(\s*)(\/document\b:?)/i;

export interface CommandParts {
  lead: string;
  command: string | null;
  body: string;
}

export function splitCommand(text: string): CommandParts {
  const match = COMMAND_PATTERN.exec(text);
  if (!match) return { lead: '', command: null, body: text };
  return { lead: match[1], command: match[2], body: text.slice(match[0].length) };
}

export type KitChatMessageView = KitChatMessage &
  CommandParts & {
    blocks: MarkdownBlock[];
  };

export function toMessageView(message: KitChatMessage): KitChatMessageView {
  if (message.role === 'USER') {
    return { ...message, ...splitCommand(message.content), blocks: [] };
  }
  return {
    ...message,
    lead: '',
    command: null,
    body: message.content,
    blocks: message.content ? parseMarkdown(message.content) : [],
  };
}
