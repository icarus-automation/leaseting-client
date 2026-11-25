import {
  type DraftMention,
  type KitMentionOption,
  activeMentionQuery,
  draftSegments,
  insertMention,
  mentionedCount,
  messageSegments,
  parseMentions,
  reconcileMentions,
  removeMentionAt,
  serializeDraft,
  trimDraft,
  writeMentionToken,
} from './kit-mention.util';

const MARIA: KitMentionOption = {
  id: 'c3a9d7e1-8b42-4f6c-a0d5-2e7b9c1f4a86',
  name: 'Maria Santos',
  unitNo: 'A1',
  propertyName: 'Lakeview Residences',
};
const ACE: KitMentionOption = {
  id: '9d2b4f61-7e3a-4c85-b1f0-8a6e2d5c3b47',
  name: 'Ace Gabriel Pasiliao',
  unitNo: '106',
  propertyName: 'Brickstone Boarding House',
};

const mention = (option: KitMentionOption, start: number): DraftMention => ({
  residentId: option.id,
  name: option.name,
  start,
  end: start + option.name.length + 1,
});

describe('mention tokens', () => {
  it('writes the token the API reads', () => {
    expect(writeMentionToken('Maria Santos', MARIA.id)).toBe(`@[Maria Santos](resident:${MARIA.id})`);
  });

  it('serializes each chip as a token and lists the ids once', () => {
    const text = 'Notices for @Maria Santos and @Ace Gabriel Pasiliao and @Maria Santos';
    const draft = { text, mentions: [mention(MARIA, 12), mention(ACE, 30), mention(MARIA, 56)] };

    expect(serializeDraft(draft)).toEqual({
      content: `Notices for ${writeMentionToken('Maria Santos', MARIA.id)} and ${writeMentionToken(
        'Ace Gabriel Pasiliao',
        ACE.id,
      )} and ${writeMentionToken('Maria Santos', MARIA.id)}`,
      mentions: [MARIA.id, ACE.id],
    });
  });

  it('sends a chip whose text was edited as the plain text it now is', () => {
    const draft = { text: 'Notice for @Maria Sant', mentions: [mention(MARIA, 11)] };
    expect(serializeDraft(draft)).toEqual({ content: 'Notice for @Maria Sant', mentions: [] });
  });

  it('reads a saved message back into text and chips, so a reload draws them again', () => {
    const content = `Create a notice for ${writeMentionToken('Maria Santos', MARIA.id)}, please`;

    expect(parseMentions(content)).toEqual({
      text: 'Create a notice for @Maria Santos, please',
      mentions: [{ residentId: MARIA.id, name: 'Maria Santos', start: 20, end: 33 }],
    });
    expect(messageSegments(content)).toEqual([
      { kind: 'text', text: 'Create a notice for ' },
      { kind: 'mention', text: '@Maria Santos', residentId: MARIA.id },
      { kind: 'text', text: ', please' },
    ]);
  });

  it('keeps the /document command and a chip apart', () => {
    const content = `/document a late notice for ${writeMentionToken('Ace Gabriel Pasiliao', ACE.id)}`;
    expect(messageSegments(content).map((segment) => segment.kind)).toEqual(['command', 'text', 'mention']);
  });

  it('leaves text that only looks like a token alone', () => {
    expect(messageSegments('Email @[Maria](resident:not-an-id) today')).toEqual([
      { kind: 'text', text: 'Email @[Maria](resident:not-an-id) today' },
    ]);
  });
});

describe('activeMentionQuery', () => {
  const plain = (text: string) => ({ text, mentions: [] });

  it('opens on an @ at the start or after a space, and reads what follows', () => {
    expect(activeMentionQuery(plain('@mar'), 4)).toEqual({ start: 0, end: 4, query: 'mar' });
    expect(activeMentionQuery(plain('notice for @maria san'), 21)).toEqual({ start: 11, end: 21, query: 'maria san' });
  });

  it('opens on a bare @ with an empty query', () => {
    expect(activeMentionQuery(plain('for @'), 5)).toEqual({ start: 4, end: 5, query: '' });
  });

  it('ignores an @ inside a word, like an email address', () => {
    expect(activeMentionQuery(plain('mail maria@example.com'), 22)).toBeNull();
  });

  it('closes across a line break, a leading space or a double space', () => {
    expect(activeMentionQuery(plain('@mar\nia'), 7)).toBeNull();
    expect(activeMentionQuery(plain('@ maria'), 7)).toBeNull();
    expect(activeMentionQuery(plain('@maria  santos'), 14)).toBeNull();
  });

  it('never reopens on a chip that is already picked', () => {
    const draft = { text: 'for @Maria Santos', mentions: [mention(MARIA, 4)] };
    expect(activeMentionQuery(draft, 17)).toBeNull();
    expect(activeMentionQuery(draft, 9)).toBeNull();
  });
});

describe('insertMention', () => {
  it('puts the chip where the @query was, with a space after it', () => {
    const next = insertMention({ text: 'notice for @mar', mentions: [] }, { start: 11, end: 15, query: 'mar' }, MARIA);

    expect(next.text).toBe('notice for @Maria Santos ');
    expect(next.mentions).toEqual([{ residentId: MARIA.id, name: 'Maria Santos', start: 11, end: 24 }]);
    expect(next.caret).toBe(25);
  });

  it('moves the chips after it along', () => {
    const draft = { text: '@a and @Ace Gabriel Pasiliao', mentions: [mention(ACE, 7)] };

    const next = insertMention(draft, { start: 0, end: 2, query: 'a' }, MARIA);

    expect(next.text).toBe('@Maria Santos and @Ace Gabriel Pasiliao');
    expect(serializeDraft(next).mentions).toEqual([MARIA.id, ACE.id]);
  });
});

describe('removeMentionAt', () => {
  const draft = { text: 'for @Maria Santos and @Ace Gabriel Pasiliao', mentions: [mention(MARIA, 4), mention(ACE, 22)] };

  it('takes a whole chip on Backspace right after it', () => {
    const next = removeMentionAt(draft, 17, 'backward');

    expect(next?.text).toBe('for  and @Ace Gabriel Pasiliao');
    expect(next?.caret).toBe(4);
    expect(next?.mentions).toEqual([{ ...mention(ACE, 9) }]);
  });

  it('takes a whole chip on Delete right before it', () => {
    expect(removeMentionAt(draft, 22, 'forward')?.text).toBe('for @Maria Santos and ');
  });

  it('leaves ordinary text to the key', () => {
    expect(removeMentionAt(draft, 20, 'backward')).toBeNull();
    expect(removeMentionAt(draft, 4, 'backward')).toBeNull();
  });
});

describe('reconcileMentions', () => {
  const text = 'for @Maria Santos ok';
  const mentions = [mention(MARIA, 4)];

  it('keeps a chip when the edit is after it', () => {
    expect(reconcileMentions(text, `${text}!`, text.length + 1, mentions)).toEqual(mentions);
  });

  it('moves a chip when text is typed before it, even an @', () => {
    expect(reconcileMentions(text, `@${text}`, 1, mentions)).toEqual([{ ...mentions[0], start: 5, end: 18 }]);
    expect(reconcileMentions('@Maria Santos', '@@Maria Santos', 1, [mention(MARIA, 0)])).toEqual([mention(MARIA, 1)]);
  });

  it('drops a chip whose text was edited, leaving plain text', () => {
    expect(reconcileMentions(text, 'for @Maria XSantos ok', 12, mentions)).toEqual([]);
  });

  it('drops a chip a deletion runs through', () => {
    expect(reconcileMentions(text, 'for @Mar ok', 8, mentions)).toEqual([]);
  });
});

describe('draft helpers', () => {
  it('trims a draft and moves its chips to match', () => {
    const trimmed = trimDraft({ text: '   for @Maria Santos  ', mentions: [mention(MARIA, 7)] });
    expect(trimmed).toEqual({ text: 'for @Maria Santos', mentions: [mention(MARIA, 4)] });
  });

  it('counts each tenant once however often they are mentioned', () => {
    expect(mentionedCount([mention(MARIA, 0), mention(MARIA, 20), mention(ACE, 40)])).toBe(2);
  });

  it('draws the composer copy as text, command and chips', () => {
    const segments = draftSegments({ text: '/document for @Maria Santos', mentions: [mention(MARIA, 14)] });
    expect(segments).toEqual([
      { kind: 'command', text: '/document' },
      { kind: 'text', text: ' for ' },
      { kind: 'mention', text: '@Maria Santos', residentId: MARIA.id },
    ]);
  });
});
