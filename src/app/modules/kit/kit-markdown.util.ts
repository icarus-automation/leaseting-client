import type { KitSource } from './kit-chat.types';
import { sourceAddress } from './kit-sources.util';

export interface MarkdownSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  /** A citation: the sources a sentence rests on, drawn as one chip where its `[n]` markers were. */
  cite?: KitSource[];
}

export type MarkdownBlock =
  | { kind: 'paragraph'; spans: MarkdownSpan[] }
  | { kind: 'bullets'; items: MarkdownSpan[][] }
  | { kind: 'numbered'; items: MarkdownSpan[][] };

type ListKind = 'bullets' | 'numbered';

const BULLET = /^\s{0,3}[-*•]\s+(.*)$/;
const NUMBERED = /^\s{0,3}\d{1,2}[.)]\s+(.*)$/;

const EMPHASIS = /\*\*(?=[^\s*])([\s\S]*?[^\s*])\*\*|\*(?=[^\s*])([^*]*[^\s*])\*|`([^`]+)`/;

const PLAIN: Omit<MarkdownSpan, 'text'> = { bold: false, italic: false, code: false };

/**
 * One or more `[n]` markers in a row. Also the forms a reply can stream
 * before the API settles it: `[^1]`, `[1, 2]`, ` [1]`.
 */
const CITATION = /(?:[ \t]*\[\^?\d{1,2}(?:\s*,\s*\^?\d{1,2})*\])+/g;
const CITATION_NUMBER = /\d{1,2}/g;

/**
 * An assistant reply as blocks. `[n]` markers become citation spans holding
 * `sources[n - 1]`; a marker with no source behind it, as while a reply is
 * still streaming, is dropped rather than shown as text.
 */
export function parseMarkdown(text: string, sources: readonly KitSource[] = []): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseSpans(paragraph.join('\n'), sources) });
    paragraph = [];
  };

  for (const line of text.split('\n')) {
    const bullet = BULLET.exec(line);
    if (bullet) {
      flush();
      appendItem(blocks, 'bullets', parseSpans(bullet[1], sources));
      continue;
    }

    const numbered = NUMBERED.exec(line);
    if (numbered) {
      flush();
      appendItem(blocks, 'numbered', parseSpans(numbered[1], sources));
      continue;
    }

    if (line.trim() === '') {
      flush();
      continue;
    }
    paragraph.push(line);
  }

  flush();
  return blocks.map(withoutRepeatedCitations);
}

/**
 * Within one paragraph or list, a run of sentences citing the same sources
 * keeps one chip, after the last of them. The API saves replies that way;
 * replies saved before it did read the same.
 */
function withoutRepeatedCitations(block: MarkdownBlock): MarkdownBlock {
  const cites = (block.kind === 'paragraph' ? block.spans : block.items.flat()).filter((span) => span.cite);
  const repeated = new Set(cites.filter((span, index) => sameSources(span, cites[index + 1])));
  if (repeated.size === 0) return block;

  const keep = (spans: MarkdownSpan[]): MarkdownSpan[] => spans.filter((span) => !repeated.has(span));
  return block.kind === 'paragraph' ? { ...block, spans: keep(block.spans) } : { ...block, items: block.items.map(keep) };
}

function sameSources(span: MarkdownSpan, next: MarkdownSpan | undefined): boolean {
  const own = span.cite ?? [];
  const other = next?.cite ?? [];
  return (
    other.length === own.length &&
    own.every((source, index) => sourceAddress(source) === sourceAddress(other[index]))
  );
}

function appendItem(blocks: MarkdownBlock[], kind: ListKind, item: MarkdownSpan[]): void {
  const last = blocks.at(-1);
  if (last && last.kind !== 'paragraph' && last.kind === kind) {
    last.items.push(item);
    return;
  }
  blocks.push({ kind, items: [item] });
}

export function parseSpans(text: string, sources: readonly KitSource[] = []): MarkdownSpan[] {
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
  const cited = spans.flatMap((span) => splitCitations(span, sources));
  return cited.length > 0 ? cited : [{ ...PLAIN, text: '' }];
}

/** Lifts `[n]` markers out of a run of text. Code keeps its brackets as typed. */
function splitCitations(span: MarkdownSpan, sources: readonly KitSource[]): MarkdownSpan[] {
  if (span.code) return [span];

  const parts: MarkdownSpan[] = [];
  let last = 0;
  for (const match of span.text.matchAll(CITATION)) {
    if (match.index > last) parts.push({ ...span, text: span.text.slice(last, match.index) });
    parts.push(...chipSpans(citedSources(match[0], sources)));
    last = match.index + match[0].length;
  }
  if (last === 0) return [span];
  if (last < span.text.length) parts.push({ ...span, text: span.text.slice(last) });
  return parts;
}

/**
 * A sentence's sources as chips: each app page its own chip, since each one
 * goes somewhere, then the web sources together, paged in one popover.
 */
function chipSpans(cited: readonly KitSource[]): MarkdownSpan[] {
  const pages = cited.filter((source) => source.kind === 'app').map((page) => ({ ...PLAIN, text: '', cite: [page] }));
  const web = cited.filter((source) => source.kind === 'docs');
  return web.length > 0 ? [...pages, { ...PLAIN, text: '', cite: web }] : pages;
}

function citedSources(markers: string, sources: readonly KitSource[]): KitSource[] {
  const numbers = new Set((markers.match(CITATION_NUMBER) ?? []).map(Number));
  return [...numbers].map((number) => sources[number - 1]).filter((source) => source !== undefined);
}
