import type { KitSource } from './kit-chat.types';

/** A route inside this app: `/word` segments only, never `//host` or a scheme. */
const APP_ROUTE = /^\/[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
const WEB_URL = /^https?:\/\//i;

/**
 * A reply's sources as the API sent them. One saved before sources had a kind
 * is a web page. A link that is not http(s), or a route that is not a plain
 * app path, makes the whole list unreadable: the reply's `[n]` markers count
 * positions in it, so dropping one entry would point the rest at the wrong
 * source.
 */
export function readSources(value: unknown): KitSource[] {
  if (!Array.isArray(value)) return [];
  const sources = value.map(readSource);
  return sources.every((source) => source !== null) ? sources : [];
}

/** Where a source leads: a web address, or a route in this app. */
export function sourceAddress(source: KitSource): string {
  return source.kind === 'app' ? source.route : source.url;
}

function readSource(entry: unknown): KitSource | null {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const { kind, title, section, url, route } = entry as Record<string, unknown>;
  if (typeof title !== 'string' || !title) return null;
  const sectionText = typeof section === 'string' && section ? section : null;

  if (kind === 'app') {
    return typeof route === 'string' && APP_ROUTE.test(route)
      ? { kind: 'app', title, section: sectionText, route }
      : null;
  }
  if (kind !== undefined && kind !== 'docs') return null;
  return typeof url === 'string' && WEB_URL.test(url) ? { kind: 'docs', title, section: sectionText, url } : null;
}
