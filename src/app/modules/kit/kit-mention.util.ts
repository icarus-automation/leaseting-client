import { splitCommand } from './kit-command.util';

/**
 * Tenant mentions in Kit chat. In the composer a mention is a span of the
 * draft, `@Maria Santos`, tied to a tenant id. On the wire, and in a saved
 * message, it is the token `@[Maria Santos](resident:<id>)`: the server checks
 * each id against the user's scope and reads records by it, never by name.
 */

/** The server rejects more than this many mentioned tenants in one message. */
export const MENTIONS_MAX = 10;

/** How far back from the caret an `@` still opens the picker. */
const QUERY_MAX = 40;

const NAME_MAX = 120;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const MENTION_TOKEN = new RegExp(`@\\[([^[\\]\\r\\n]{1,${NAME_MAX}})\\]\\(resident:(${UUID})\\)`, 'gi');

/** A tenant the picker offers. */
export interface KitMentionOption {
  id: string;
  name: string;
  unitNo: string | null;
  propertyName: string | null;
}

/** A mention in a draft: the `@Name` text at [start, end) stands for `residentId`. */
export interface DraftMention {
  residentId: string;
  name: string;
  start: number;
  end: number;
}

/** A draft and its mentions, which move together. */
export interface MentionDraft {
  text: string;
  mentions: DraftMention[];
}

/** The `@query` the caret is in, which the picker filters on. */
export interface MentionQuery {
  start: number;
  end: number;
  query: string;
}

export type KitTextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'command'; text: string }
  | { kind: 'mention'; text: string; residentId: string };

export function mentionLabel(name: string): string {
  return `@${mentionName(name)}`;
}

/** The same token the API writes: brackets and line breaks cannot survive in a name. */
export function writeMentionToken(name: string, residentId: string): string {
  return `@[${mentionName(name)}](resident:${residentId.toLowerCase()})`;
}

/** The request body for a draft: tokens in place of each mention, and the ids once each. */
export function serializeDraft(draft: MentionDraft): { content: string; mentions: string[] } {
  const live = liveMentions(draft);
  let content = draft.text;
  for (const mention of [...live].sort((a, b) => b.start - a.start)) {
    content =
      content.slice(0, mention.start) +
      writeMentionToken(mention.name, mention.residentId) +
      content.slice(mention.end);
  }
  return { content, mentions: uniqueIds(live) };
}

/** A saved message read back into a draft-like shape, so its chips can be drawn. */
export function parseMentions(content: string): MentionDraft {
  const mentions: DraftMention[] = [];
  let text = '';
  let cursor = 0;
  for (const match of content.matchAll(MENTION_TOKEN)) {
    const index = match.index ?? 0;
    text += content.slice(cursor, index);
    const label = mentionLabel(match[1]);
    mentions.push({ residentId: match[2].toLowerCase(), name: match[1], start: text.length, end: text.length + label.length });
    text += label;
    cursor = index + match[0].length;
  }
  return { text: text + content.slice(cursor), mentions };
}

/** The draft split for drawing: the /document command, mention chips and plain text. */
export function draftSegments(draft: MentionDraft): KitTextSegment[] {
  const { lead, command } = splitCommand(draft.text);
  const marks: { start: number; end: number; segment: KitTextSegment }[] = [];
  if (command) {
    marks.push({
      start: lead.length,
      end: lead.length + command.length,
      segment: { kind: 'command', text: command },
    });
  }
  for (const mention of liveMentions(draft)) {
    marks.push({
      start: mention.start,
      end: mention.end,
      segment: { kind: 'mention', text: draft.text.slice(mention.start, mention.end), residentId: mention.residentId },
    });
  }
  marks.sort((a, b) => a.start - b.start);

  const segments: KitTextSegment[] = [];
  let cursor = 0;
  for (const mark of marks) {
    if (mark.start < cursor) continue;
    if (mark.start > cursor) segments.push({ kind: 'text', text: draft.text.slice(cursor, mark.start) });
    segments.push(mark.segment);
    cursor = mark.end;
  }
  if (cursor < draft.text.length) segments.push({ kind: 'text', text: draft.text.slice(cursor) });
  return segments;
}

/** A saved user message, split for drawing. */
export function messageSegments(content: string): KitTextSegment[] {
  return draftSegments(parseMentions(content));
}

/**
 * The `@query` ending at the caret, if the caret is in one. The `@` must start
 * the text or follow a space, so an email address never opens the picker.
 */
export function activeMentionQuery(draft: MentionDraft, caret: number): MentionQuery | null {
  if (draft.mentions.some((mention) => caret > mention.start && caret <= mention.end)) return null;

  const before = draft.text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0 || caret - at - 1 > QUERY_MAX) return null;
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  if (draft.mentions.some((mention) => at >= mention.start && at < mention.end)) return null;

  const query = before.slice(at + 1);
  if (/[\r\n]/.test(query) || /^\s/.test(query) || /\s{2}/.test(query)) return null;
  return { start: at, end: caret, query };
}

/** Puts a picked tenant where the `@query` was, followed by a space. */
export function insertMention(
  draft: MentionDraft,
  query: MentionQuery,
  option: KitMentionOption,
): MentionDraft & { caret: number } {
  const label = mentionLabel(option.name);
  const after = draft.text.slice(query.end);
  const inserted = /^\s/.test(after) ? label : `${label} `;
  const delta = inserted.length - (query.end - query.start);

  const mentions = draft.mentions.map((mention) =>
    mention.start >= query.end ? { ...mention, start: mention.start + delta, end: mention.end + delta } : mention,
  );
  mentions.push({ residentId: option.id, name: option.name, start: query.start, end: query.start + label.length });
  mentions.sort((a, b) => a.start - b.start);

  return {
    text: draft.text.slice(0, query.start) + inserted + after,
    mentions,
    caret: query.start + inserted.length,
  };
}

/**
 * Backspace just after a chip, or Delete just before one, takes the whole chip.
 * Returns null when the caret is not against a chip, so the key works as usual.
 */
export function removeMentionAt(
  draft: MentionDraft,
  caret: number,
  direction: 'backward' | 'forward',
): (MentionDraft & { caret: number }) | null {
  const target = draft.mentions.find((mention) =>
    direction === 'backward'
      ? caret > mention.start && caret <= mention.end
      : caret >= mention.start && caret < mention.end,
  );
  if (!target) return null;

  const length = target.end - target.start;
  return {
    text: draft.text.slice(0, target.start) + draft.text.slice(target.end),
    mentions: draft.mentions
      .filter((mention) => mention !== target)
      .map((mention) =>
        mention.start >= target.end ? { ...mention, start: mention.start - length, end: mention.end - length } : mention,
      ),
    caret: target.start,
  };
}

/**
 * Moves the mentions along with an edit of the draft. `caret` is where the
 * edit ended, which tells an insertion before a chip from one inside it. A chip
 * whose text was edited stops being a mention and stays as plain text.
 */
export function reconcileMentions(previous: string, next: string, caret: number, mentions: DraftMention[]): DraftMention[] {
  if (mentions.length === 0) return mentions;

  const { start, end } = changedRange(previous, next, caret);
  const delta = next.length - previous.length;
  return mentions.flatMap((mention) => {
    if (mention.end <= start) return [mention];
    if (mention.start >= end) return [{ ...mention, start: mention.start + delta, end: mention.end + delta }];
    return [];
  });
}

/** The draft without leading or trailing whitespace, its mentions moved to match. */
export function trimDraft(draft: MentionDraft): MentionDraft {
  const lead = draft.text.length - draft.text.trimStart().length;
  const text = draft.text.trim();
  const mentions = draft.mentions
    .map((mention) => ({ ...mention, start: mention.start - lead, end: mention.end - lead }))
    .filter((mention) => mention.start >= 0 && mention.end <= text.length);
  return { text, mentions };
}

/** How many different tenants a draft mentions. */
export function mentionedCount(mentions: readonly DraftMention[]): number {
  return new Set(mentions.map((mention) => mention.residentId)).size;
}

/** The part of `previous` an edit replaced, as [start, end). */
function changedRange(previous: string, next: string, caret: number): { start: number; end: number } {
  const tail = next.length - caret;
  const caretFits = caret >= 0 && tail >= 0 && tail <= previous.length && next.slice(caret) === previous.slice(previous.length - tail);
  const end = caretFits ? previous.length - tail : commonSuffixEnd(previous, next);
  const limit = Math.min(caretFits ? caret : next.length, end);
  let start = 0;
  while (start < limit && previous[start] === next[start]) start += 1;
  return { start, end };
}

function commonSuffixEnd(previous: string, next: string): number {
  let suffix = 0;
  const max = Math.min(previous.length, next.length);
  while (suffix < max && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix += 1;
  return previous.length - suffix;
}

/** Mentions whose text is still exactly their label. Anything else is plain text now. */
function liveMentions(draft: MentionDraft): DraftMention[] {
  return draft.mentions.filter((mention) => draft.text.slice(mention.start, mention.end) === mentionLabel(mention.name));
}

function uniqueIds(mentions: readonly DraftMention[]): string[] {
  return [...new Set([...mentions].sort((a, b) => a.start - b.start).map((mention) => mention.residentId))];
}

function mentionName(name: string): string {
  const cleaned = name.replace(/[[\]\r\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return cleaned || 'Tenant';
}
