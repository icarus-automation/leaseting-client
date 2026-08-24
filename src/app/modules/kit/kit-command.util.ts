import type { KitChatMessage } from './kit-chat.types';
import { type MarkdownBlock, parseMarkdown } from './kit-markdown.util';

/**
 * Where the `/document` trigger is recognised on the client.
 *
 * Deliberately the same shape as the server's own pattern in
 * `documents/document-command.util.ts` — optional colon, word boundary so
 * `/documents` is just a word. Highlighting text the backend would not act on
 * is worse than not highlighting at all, so the two must not drift.
 */
const COMMAND_PATTERN = /^(\s*)(\/document\b:?)/i;

/** A message split around its trigger, so the trigger can be styled apart. */
export interface CommandParts {
  /** Whitespace before the trigger. `send()` trims it; the composer must not. */
  lead: string;
  /** The trigger exactly as typed, or null when this is ordinary chat. */
  command: string | null;
  /** Everything after the trigger — the whole text when there is none. */
  body: string;
}

/** `lead + (command ?? '') + body` always reconstructs the input exactly. */
export function splitCommand(text: string): CommandParts {
  const match = COMMAND_PATTERN.exec(text);
  if (!match) return { lead: '', command: null, body: text };
  return { lead: match[1], command: match[2], body: text.slice(match[0].length) };
}

/** A transcript row, prepared for rendering. */
export type KitChatMessageView = KitChatMessage &
  CommandParts & {
    /** Kit's reply as blocks. Empty for the user's own turns. */
    blocks: MarkdownBlock[];
  };

/**
 * The two roles are prepared differently because they are different text.
 *
 * The user's turn is echoed back exactly as typed, with only the `/document`
 * trigger split out so it can be tinted — nothing else about it is
 * interpreted, which is what makes the echo trustworthy.
 *
 * Kit's turn is Markdown, and is parsed. Running the command pattern over it
 * too would light up a reply that merely opens with the word.
 */
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
