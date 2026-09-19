
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

const BULLET = /^\s{0,3}[-*•]\s+(.*)$/;
const NUMBERED = /^\s{0,3}\d{1,2}[.)]\s+(.*)$/;

const EMPHASIS = /\*\*(?=[^\s*])([\s\S]*?[^\s*])\*\*|\*(?=[^\s*])([^*]*[^\s*])\*|`([^`]+)`/;

const PLAIN: Omit<MarkdownSpan, 'text'> = { bold: false, italic: false, code: false };

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

function appendItem(blocks: MarkdownBlock[], kind: ListKind, item: MarkdownSpan[]): void {
  const last = blocks.at(-1);
  if (last && last.kind !== 'paragraph' && last.kind === kind) {
    last.items.push(item);
    return;
  }
  blocks.push({ kind, items: [item] });
}

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
  return spans.length > 0 ? spans : [{ ...PLAIN, text: '' }];
}
