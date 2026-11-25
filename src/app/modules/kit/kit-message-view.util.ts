import type { KitChatMessage } from './kit-chat.types';
import { type MarkdownBlock, parseMarkdown } from './kit-markdown.util';
import { type KitTextSegment, messageSegments } from './kit-mention.util';

export type KitChatMessageView = KitChatMessage & {
  /** A user message, drawn as text, the /document command and tenant chips. */
  segments: KitTextSegment[];
  /** An assistant reply, drawn as Markdown. */
  blocks: MarkdownBlock[];
};

export function toMessageView(message: KitChatMessage): KitChatMessageView {
  if (message.role === 'USER') {
    return { ...message, segments: messageSegments(message.content), blocks: [] };
  }
  return {
    ...message,
    segments: [],
    blocks: message.content ? parseMarkdown(message.content) : [],
  };
}
