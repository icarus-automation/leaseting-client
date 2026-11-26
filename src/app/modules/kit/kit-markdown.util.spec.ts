import { parseMarkdown, parseSpans } from './kit-markdown.util';
import { sourceAddress } from './kit-sources.util';

const flatten = (text: string): string =>
  parseSpans(text)
    .map((span) => span.text)
    .join('');

describe('parseSpans', () => {
  it('reads bold, which is the whole reason this exists', () => {
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
    expect(flatten('2 * 3 = 6')).toBe('2 * 3 = 6');
    expect(flatten('a ** b')).toBe('a ** b');
    expect(flatten('half **open')).toBe('half **open');
    expect(flatten('`unclosed')).toBe('`unclosed');
  });

  it('leaves underscores alone, because identifiers use them', () => {
    expect(flatten('the unpaid_bills dataset')).toBe('the unpaid_bills dataset');
    expect(parseSpans('the unpaid_bills dataset')).toHaveLength(1);
  });

  it('strips the markers it understands and nothing else', () => {
    const cases: [string, string][] = [
      ['plain text', 'plain text'],
      ['**a**b*c*d`e`f', 'abcdef'],
      ['**₱12,500.00** is due', '₱12,500.00 is due'],
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
    expect(parseMarkdown('-5 days overdue')[0].kind).toBe('paragraph');
  });

  it('produces nothing for an empty reply, so the bubble stays hidden', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('\n\n  \n')).toEqual([]);
  });
});

describe('citations', () => {
  const run = { kind: 'docs' as const, title: 'Bill utilities from meter readings', section: 'Bill a whole property this month', url: 'https://docs.leaseting.com/billing/utility-bills#monthly-run' };
  const readings = { kind: 'docs' as const, title: 'Bill utilities from meter readings', section: 'How meter readings carry over', url: 'https://docs.leaseting.com/billing/utility-bills#readings' };

  it('turns markers into one chip at the end of the sentence they follow', () => {
    const spans = parseSpans('Choose **Utility run**.[1] Previous fills itself in.[2][1]', [run, readings]);
    expect(spans.map((span) => span.cite ?? span.text)).toEqual([
      'Choose ',
      'Utility run',
      '.',
      [run],
      ' Previous fills itself in.',
      [readings, run],
    ]);
  });

  it('hides a marker with no source behind it, as while a reply streams', () => {
    expect(flattenCited('Choose Utility run.[1] Done [2, 3].', [])).toBe('Choose Utility run. Done.');
    expect(flattenCited('Choose Utility run.[3]', [run])).toBe('Choose Utility run.');
  });

  it('reads markers inside bold and list items, and leaves code alone', () => {
    const [list] = parseMarkdown('- **Open Bills.[1]**\n- Type `arr[1]` as is', [run]);
    if (list.kind !== 'bullets') throw new Error('expected bullets');
    expect(list.items[0].map((span) => span.cite ?? span.text)).toEqual(['Open Bills.', [run]]);
    expect(list.items[1][1]).toMatchObject({ text: 'arr[1]', code: true });
  });

  it('keeps ordinary brackets that are not markers', () => {
    expect(flattenCited('Unit [A1] and [the lobby]', [run])).toBe('Unit [A1] and [the lobby]');
  });
});

function flattenCited(text: string, sources: Parameters<typeof parseSpans>[1]): string {
  return parseSpans(text, sources)
    .filter((span) => !span.cite)
    .map((span) => span.text)
    .join('');
}

describe('repeated citations', () => {
  const run = { kind: 'docs' as const, title: 'Bill utilities from meter readings', section: 'Bill a whole property this month', url: 'https://docs.leaseting.com/billing/utility-bills#monthly-run' };
  const readings = { kind: 'docs' as const, title: 'Bill utilities from meter readings', section: 'How meter readings carry over', url: 'https://docs.leaseting.com/billing/utility-bills#readings' };
  const chips = (spans: { cite?: unknown[] }[]) => spans.filter((span) => span.cite).length;

  it('draws one chip for a run of steps on the same source, as a reply saved before the API settled it', () => {
    const blocks = parseMarkdown('Go to Bills.[1]\n\n1. Pick the property.[1]\n2. Set the rate.[1]\n3. Type the readings.[1]', [run]);
    const [intro, list] = blocks;
    if (intro.kind !== 'paragraph' || list.kind !== 'numbered') throw new Error('expected a paragraph and a list');
    expect(chips(intro.spans)).toBe(1);
    expect(list.items.map(chips)).toEqual([0, 0, 1]);
    expect(list.items[0].map((span) => span.text).join('')).toBe('Pick the property.');
  });

  it('keeps each chip when the sources change from one sentence to the next', () => {
    const [paragraph] = parseMarkdown('Open Bills.[1] Previous carries over.[2] Then create the bills.[1]', [run, readings]);
    if (paragraph.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(paragraph.spans.filter((span) => span.cite).map((span) => span.cite?.[0] && sourceAddress(span.cite[0]))).toEqual([run.url, readings.url, run.url]);
  });
});

describe('app page citations', () => {
  const properties = { kind: 'app' as const, title: 'Properties', section: null, route: '/properties' };
  const bills = { kind: 'app' as const, title: 'Bills', section: null, route: '/bills' };
  const guide = { kind: 'docs' as const, title: 'Set up your first property', section: null, url: 'https://docs.leaseting.com/getting-started' };

  it('gives each app page a chip of its own, then the web sources together', () => {
    const spans = parseSpans('Go to Properties and click New property.[1][2][3]', [guide, properties, bills]);
    expect(spans.filter((span) => span.cite).map((span) => span.cite)).toEqual([[properties], [bills], [guide]]);
  });

  it('keeps one chip for a page cited after every step', () => {
    const [list] = parseMarkdown('1. Open Properties.[1]\n2. Click New property.[1]', [properties]);
    if (list.kind !== 'numbered') throw new Error('expected numbered');
    expect(list.items.map((item) => item.filter((span) => span.cite).length)).toEqual([0, 1]);
  });
});
