/**
 * The small slice of Markdown Kit's replies are allowed to use.
 *
 * Kit writes Markdown whether or not we ask it to — every model does — so the
 * only real choice is between rendering it and showing the user
 * `**Create a bill**` with the asterisks intact. This renders it.
 *
 * Parsed into a token tree rather than a string of HTML, because the template
 * then draws it with ordinary bindings. Nothing here produces markup, so there
 * is no `innerHTML`, no `bypassSecurityTrust*`, and no path by which text that
 * arrived from a language model — which in turn read the organization's own
 * records — becomes an element on the page.
 *
 * Deliberately small. Tables, links, images, headings, blockquotes and fenced
 * code are all absent, and Kit's own prompt lists the same four things, so what
 * it writes and what this understands stay in step.
 */

/** A run of text carrying at most one emphasis. */
export interface MarkdownSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
}

export type MarkdownBlock =
  | { kind: 'paragraph'; spans: MarkdownSpan[] }
  | { kind: 'bullets'; items: MarkdownSpan[][] }
  | { kind: 'numbered'; items: MarkdownSpan[][] };

type ListKind = 'bullets' | 'numbered';

/** `- item`, `* item`, `• item` — the three a model reaches for. */
const BULLET = /^\s{0,3}[-*•]\s+(.*)$/;
/** `1. item`, `2) item`. */
const NUMBERED = /^\s{0,3}\d{1,2}[.)]\s+(.*)$/;

/**
 * Emphasis, in one pass so the alternatives cannot overlap.
 *
 * `**` is tried before `*`, or bold reads as an italic wrapping a stray
 * asterisk. Every run must both open and close on a character that is neither
 * whitespace nor an asterisk — not merely a non-space, which let `****` close
 * an italic on the marker itself and render as `**`. That rule is what keeps a
 * lone `*`, an arithmetic `a * b` and a row of asterisks as the characters
 * they are.
 *
 * Underscores are not emphasis here on purpose: `_` is a word character to
 * everyone who writes an identifier, and `snake_case_name` rendering as
 * "snake case name" in italics is a worse bug than the one being fixed.
 */
const EMPHASIS = /\*\*(?=[^\s*])([\s\S]*?[^\s*])\*\*|\*(?=[^\s*])([^*]*[^\s*])\*|`([^`]+)`/;

const PLAIN: Omit<MarkdownSpan, 'text'> = { bold: false, italic: false, code: false };

/**
 * Splits a reply into blocks.
 *
 * A blank line ends a paragraph; consecutive list lines gather into one list.
 * A single newline *inside* a paragraph is kept, because Kit uses short dashed
 * lines that are not really lists and the bubble preserves them.
 */
export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseSpans(paragraph.join('\n')) });
    paragraph = [];
  };

  for (const line of text.split('\n')) {
    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      appendItem(blocks, 'bullets', parseSpans(bullet[1]));
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      flush();
      appendItem(blocks, 'numbered', parseSpans(numbered[1]));
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/** Extends the list already open, so three bullets are one list and not three. */
function appendItem(blocks: MarkdownBlock[], kind: ListKind, item: MarkdownSpan[]): void {
  const last = blocks.at(-1);
  if (last && last.kind !== 'paragraph' && last.kind === kind) {
    last.items.push(item);
    return;
  }
  blocks.push({ kind, items: [item] });
}

/**
 * Splits one line into emphasised and plain runs.
 *
 * Flat rather than recursive: Kit does not nest emphasis, and a scan that
 * cannot re-enter itself cannot be walked into a stack overflow by a reply
 * built from records we do not control.
 */
export function parseSpans(text: string): MarkdownSpan[] {
  const spans: MarkdownSpan[] = [];
  let rest = text;

  while (rest.length > 0) {
    const match = EMPHASIS.exec(rest);
    if (!match) break;

    if (match.index > 0) spans.push({ ...PLAIN, text: rest.slice(0, match.index) });

    const [, bold, italic, code] = match;
    if (bold !== undefined) spans.push({ ...PLAIN, text: bold, bold: true });
    else if (italic !== undefined) spans.push({ ...PLAIN, text: italic, italic: true });
    else spans.push({ ...PLAIN, text: code, code: true });

    rest = rest.slice(match.index + match[0].length);
  }

  if (rest.length > 0) spans.push({ ...PLAIN, text: rest });
  // A line that is empty still needs one span, or the block renders as nothing.
  return spans.length > 0 ? spans : [{ ...PLAIN, text: '' }];
}
