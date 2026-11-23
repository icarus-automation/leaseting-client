/**
 * A privacy notice is plain text with three conventions, shared with
 * Residence Care: a line starting with `## ` is a heading, a line starting
 * with `- ` is a list item, and a blank line ends a paragraph. Nothing else
 * is markup, so a notice can never carry HTML.
 */
export type NoticeBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

export function parseNoticeBody(body: string): NoticeBlock[] {
  const blocks: NoticeBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    if (list.length > 0) blocks.push({ kind: 'list', items: list });
    paragraph = [];
    list = [];
  };

  for (const raw of body.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'heading', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      if (paragraph.length > 0) flush();
      list.push(line.slice(2).trim());
    } else {
      if (list.length > 0) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
