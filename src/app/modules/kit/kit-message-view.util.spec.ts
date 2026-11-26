import type { KitChatMessage } from './kit-chat.types';
import { toMessageView } from './kit-message-view.util';

const REPLY: KitChatMessage = {
  id: 'message-1',
  role: 'ASSISTANT',
  content: 'Choose Utility run.[1]',
  createdAt: '2026-11-26T08:00:00.000Z',
};

describe('toMessageView', () => {
  it('draws a saved reply’s markers as a chip for its sources', () => {
    const source = { kind: 'docs' as const, title: 'Bill utilities from meter readings', section: 'Bill a whole property this month', url: 'https://docs.leaseting.com/billing/utility-bills#monthly-run' };
    const [block] = toMessageView({ ...REPLY, sources: [source] }).blocks;
    if (block.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(block.spans.at(-1)?.cite).toEqual([source]);
  });

  it('reads a source saved before sources had a kind as the web page it was', () => {
    const old = { title: 'Bill utilities from meter readings', section: null, url: 'https://docs.leaseting.com/billing/utility-bills' };
    const [block] = toMessageView({ ...REPLY, sources: [old] as never }).blocks;
    if (block.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(block.spans.at(-1)?.cite).toEqual([{ kind: 'docs', ...old }]);
  });

  it('reads a reply from an API with no sources as plain text, never as a bracket', () => {
    const [block] = toMessageView(REPLY).blocks;
    if (block.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(block.spans).toEqual([{ text: 'Choose Utility run.', bold: false, italic: false, code: false }]);
  });
});
