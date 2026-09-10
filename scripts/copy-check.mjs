#!/usr/bin/env node
/**
 * Fails if leaseting-client UI copy still has banned marketing phrases,
 * cute report titles, or off-glossary words in templates.
 *
 * Usage: node scripts/copy-check.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const src = join(root, 'src');
const glossary = JSON.parse(readFileSync(join(root, 'scripts/copy-glossary.json'), 'utf8'));

const BANNED = glossary.bannedPhrases.map((phrase) => ({
  phrase,
  re: new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
}));

const RETIRED_TITLES = (glossary.retiredTitles ?? []).map((phrase) => ({
  phrase,
  re: new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
}));

const HTML_WORDS = [
  { phrase: 'guard (use parking attendant)', re: /\bguards?\b/i },
  { phrase: 'till (use shift)', re: /\btills?\b/i },
  { phrase: 'gate (use terminal)', re: /\bgates?\b/i },
  { phrase: 'Colour (use Color, or drop it)', re: /\bColour\b/ },
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function stripHtmlComments(text) {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function hitsIn(text, rules) {
  const found = [];
  for (const rule of rules) {
    if (rule.re.test(text)) found.push(rule.phrase);
  }
  return found;
}

const COPY_TS = new Set([
  'src/app/modules/reports/report-catalog.ts',
  'src/app/modules/settings/settings-nav.ts',
  'src/app/layout/sidebar/sidebar.ts',
  'src/app/shared/ui/command-palette/command-palette.ts',
  'src/app/shared/ui/coming-soon/coming-soon.ts',
  'src/app/modules/work-orders/work-orders.ts',
  'src/app/modules/kit/kit-chat.ts',
  'src/app/modules/auth/auth-shell/auth-shell.ts',
  'src/app/modules/knowledge-base/knowledge-base.ts',
  'src/app/modules/reports/pages/parking-revenue/parking-revenue.ts',
  'src/app/modules/reports/pages/shift-cash-variance/shift-cash-variance.ts',
  'src/app/modules/reports/pages/void-audit/void-audit.ts',
]);

const INLINE_TEMPLATE_TS = new Set([
  'src/app/shared/ui/coming-soon/coming-soon.ts',
  'src/app/shared/ui/empty-state/empty-state.ts',
  'src/app/modules/reports/components/report-card/report-card.ts',
  'src/app/modules/reports/components/parking-scope-filter/parking-scope-filter.ts',
  'src/app/modules/settings/components/settings-page-shell/settings-page-shell.ts',
]);

function stripTsComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const files = walk(src);
const problems = [];

for (const file of files) {
  const ext = extname(file);
  const rel = relative(root, file).replaceAll('\\', '/');
  if (ext === '.html') {
    const text = stripHtmlComments(readFileSync(file, 'utf8'));
    for (const phrase of hitsIn(text, [...BANNED, ...RETIRED_TITLES, ...HTML_WORDS])) {
      problems.push(`${rel}: ${phrase}`);
    }
  } else if (COPY_TS.has(rel) || INLINE_TEMPLATE_TS.has(rel)) {
    const raw = stripTsComments(readFileSync(file, 'utf8'));
    const withoutKeywords = raw.replace(/keywords:\s*'[^']*'/g, '');
    const rules = INLINE_TEMPLATE_TS.has(rel)
      ? [...BANNED, ...RETIRED_TITLES, ...HTML_WORDS]
      : [...BANNED, ...RETIRED_TITLES];
    for (const phrase of hitsIn(withoutKeywords, rules)) {
      problems.push(`${rel}: ${phrase}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`copy-check: ${problems.length} hit(s)`);
  for (const line of problems) console.error(`  ${line}`);
  process.exit(1);
}

console.log('copy-check: clean');
