const COMMAND_PATTERN = /^(\s*)(\/document\b:?)/i;

export interface CommandParts {
  lead: string;
  command: string | null;
  body: string;
}

export function splitCommand(text: string): CommandParts {
  const match = COMMAND_PATTERN.exec(text);
  if (!match) return { lead: '', command: null, body: text };
  return { lead: match[1], command: match[2], body: text.slice(match[0].length) };
}
