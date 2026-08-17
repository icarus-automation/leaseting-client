import type { KitChatMessage } from './kit-chat.types';

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

/** A transcript row with its command split out for rendering. */
export type KitChatMessageView = KitChatMessage & CommandParts;

/**
 * Only the user's own turns carry a command — Kit's replies are prose, and
 * running the pattern over them would light up a sentence that merely opens
 * with the word.
 */
export function toMessageView(message: KitChatMessage): KitChatMessageView {
  return message.role === 'USER'
    ? { ...message, ...splitCommand(message.content) }
    : { ...message, lead: '', command: null, body: message.content };
}
