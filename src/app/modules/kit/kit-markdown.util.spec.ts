import { parseMarkdown, parseSpans } from './kit-markdown.util';

/** The visible text of a parsed line, ignoring which runs were emphasised. */
const flatten = (text: string): string =>
  parseSpans(text)
    .map((span) => span.text)
    .join('');

describe('parseSpans', () => {
  it('reads bold, which is the whole reason this exists', () => {
    // The reported bug: "**Create a bill**: Go to Bills" arrived on screen
    // with its asterisks showing.
    expect(parseSpans('**Create a bill**: Go to Bills')).toEqual([
      { text: 'Create a bill', bold: true, italic: false, code: false },
      { text: ': Go to Bills', bold: false, italic: false, code: false },
    ]);
  });

  it('reads italics and inline code', () => {
    expect(parseSpans('*maybe*')[0]).toMatchObject({ text: 'maybe', italic: true });
    expect(parseSpans('press `New Bill`')[1]).toMatchObject({ text: 'New Bill', code: true });
  });

  it('reads several runs on one line', () => {
    const spans = parseSpans('**a** then **b**');
    expect(spans.map((span) => span.text)).toEqual(['a', ' then ', 'b']);
    expect(spans.map((span) => span.bold)).toEqual([true, false, true]);
  });

  it('does not mistake bold for italics wrapping an asterisk', () => {
    expect(parseSpans('**bold**')).toHaveLength(1);
    expect(parseSpans('**bold**')[0]).toMatchObject({ bold: true, italic: false });
  });

  it('leaves an unpaired marker as the character it is', () => {
    // Losing text is far worse than showing a stray asterisk, so anything
    // that does not close stays exactly as written.
    expect(flatten('2 * 3 = 6')).toBe('2 * 3 = 6');
    expect(flatten('a ** b')).toBe('a ** b');
    expect(flatten('half **open')).toBe('half **open');
    expect(flatten('`unclosed')).toBe('`unclosed');
  });

  it('leaves underscores alone, because identifiers use them', () => {
    // `snake_case_name` rendering as italics would be a worse bug than the
    // one this file fixes.
    expect(flatten('the unpaid_bills dataset')).toBe('the unpaid_bills dataset');
    expect(parseSpans('the unpaid_bills dataset')).toHaveLength(1);
  });

  it('strips the markers it understands and nothing else', () => {
    const cases: [string, string][] = [
      ['plain text', 'plain text'],
      ['**a**b*c*d`e`f', 'abcdef'],
      ['**₱12,500.00** is due', '₱12,500.00 is due'],
      // Nothing below closes cleanly, so nothing is treated as a marker and
      // the text survives intact — the failure mode to prefer by far.
      ['****', '****'],
      ['`` ', '`` '],
      ['a ** b', 'a ** b'],
      ['*** weird ***', '*** weird ***'],
    ];
    for (const [input, visible] of cases) {
      expect(flatten(input)).toBe(visible);
    }
  });

  it('never loses a character that is not a marker', () => {
    const strip = (text: string): string => text.replace(/[*`]/g, '');
    for (const input of ['plain text', '**a**b*c*d`e`f', '*** weird ***', '****', 'a ** b']) {
      expect(strip(flatten(input))).toBe(strip(input));
    }
  });

  it('gives an empty line something to render', () => {
    expect(parseSpans('')).toEqual([{ text: '', bold: false, italic: false, code: false }]);
  });
});

describe('parseMarkdown', () => {
  it('gathers consecutive bullets into one list', () => {
    const blocks = parseMarkdown('Here:\n\n- first\n- second\n- third');
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'bullets']);
    const [, list] = blocks;
    if (list.kind !== 'bullets') throw new Error('expected bullets');
    expect(list.items).toHaveLength(3);
  });

  it('keeps a numbered list apart from a bulleted one', () => {
    const blocks = parseMarkdown('1. one\n2. two\n- and\n- also');
    expect(blocks.map((block) => block.kind)).toEqual(['numbered', 'bullets']);
  });

  it('splits paragraphs on a blank line and keeps newlines inside one', () => {
    const blocks = parseMarkdown('first line\nsame paragraph\n\nsecond paragraph');
    expect(blocks).toHaveLength(2);
    const [first] = blocks;
    if (first.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(first.spans[0].text).toBe('first line\nsame paragraph');
  });

  it('reads emphasis inside a list item', () => {
    const blocks = parseMarkdown('- **Create a bill**: go to Bills');
    const [list] = blocks;
    if (list.kind !== 'bullets') throw new Error('expected bullets');
    expect(list.items[0][0]).toMatchObject({ text: 'Create a bill', bold: true });
  });

  it('does not turn a sentence that merely starts with a dash into a list', () => {
    // "-5 days overdue" is a figure, not a bullet: a bullet needs the space.
    expect(parseMarkdown('-5 days overdue')[0].kind).toBe('paragraph');
  });

  it('produces nothing for an empty reply, so the bubble stays hidden', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('\n\n  \n')).toEqual([]);
  });
});
