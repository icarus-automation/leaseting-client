import { parseNoticeBody } from './notice-format.util';

describe('parseNoticeBody', () => {
  it('reads headings, list items, and paragraphs', () => {
    const body = [
      'Brickstone Living ("we") manages the property you rent.',
      'This notice explains what we collect.',
      '',
      '## What we collect',
      '- Your name and phone number.',
      '- A valid government ID.',
      '',
      '## Your rights',
      'You may ask to see your information.',
    ].join('\n');

    expect(parseNoticeBody(body)).toEqual([
      {
        kind: 'paragraph',
        text: 'Brickstone Living ("we") manages the property you rent. This notice explains what we collect.',
      },
      { kind: 'heading', text: 'What we collect' },
      { kind: 'list', items: ['Your name and phone number.', 'A valid government ID.'] },
      { kind: 'heading', text: 'Your rights' },
      { kind: 'paragraph', text: 'You may ask to see your information.' },
    ]);
  });

  it('ends a list at a paragraph line and a paragraph at a list item', () => {
    expect(parseNoticeBody('Intro\n- One\n- Two\nAfter\r\n- Three')).toEqual([
      { kind: 'paragraph', text: 'Intro' },
      { kind: 'list', items: ['One', 'Two'] },
      { kind: 'paragraph', text: 'After' },
      { kind: 'list', items: ['Three'] },
    ]);
  });

  it('keeps markup as text', () => {
    expect(parseNoticeBody('<script>alert(1)</script>')).toEqual([
      { kind: 'paragraph', text: '<script>alert(1)</script>' },
    ]);
  });

  it('returns nothing for an empty notice', () => {
    expect(parseNoticeBody(' \n\n')).toEqual([]);
  });
});
