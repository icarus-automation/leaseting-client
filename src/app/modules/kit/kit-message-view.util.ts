import type { KitChatMessage } from './kit-chat.types';
import { type MarkdownBlock, parseMarkdown } from './kit-markdown.util';
import { type KitTextSegment, messageSegments } from './kit-mention.util';
import { readSources } from './kit-sources.util';

export type KitChatMessageView = KitChatMessage & {
  /** A user message, drawn as text, the /document command and tenant chips. */
  segments: KitTextSegment[];
  /** An assistant reply, drawn as Markdown, its `[n]` markers as source chips. */
  blocks: MarkdownBlock[];
};

/**
 * A message as drawn. A reply from an API that predates sources has none, so
 * its text reads exactly as before.
 */
export function toMessageView(message: KitChatMessage): KitChatMessageView {
  if (message.role === 'USER') {
    return { ...message, segments: messageSegments(message.content), blocks: [] };
  }
  return {
    ...message,
    segments: [],
    blocks: message.content ? parseMarkdown(message.content, readSources(message.sources)) : [],
  };
}
