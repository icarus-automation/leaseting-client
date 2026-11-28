import type { AbstractControl } from '@angular/forms';

/** A word starts at the first letter, or at a letter after a space, hyphen or apostrophe. */
const WORD_START = /(^|[\s'’-])(\p{L})/gu;

/**
 * A person's name the way the API stores it. Spaces are trimmed and collapsed. A name
 * typed all in lowercase or all in caps gets a capital at the start of each word; any
 * other mix is kept as typed, so "McArthur" and "dela Cruz" stay as they are.
 */
export function normalizePersonName(name: string): string {
  const tidy = name.trim().replace(/\s+/g, ' ');
  const lower = tidy.toLowerCase();
  const upper = tidy.toUpperCase();
  if (lower === upper) return tidy;
  if (tidy !== lower && tidy !== upper) return tidy;
  return lower.replace(WORD_START, (_match, before: string, letter: string) => before + letter.toUpperCase());
}

/** Puts a name field's value in its saved form. Called as the field is left, so people see what is saved. */
export function tidyNameField(control: AbstractControl<string | null>): void {
  const value = control.value ?? '';
  const tidy = normalizePersonName(value);
  if (tidy !== value) control.setValue(tidy);
}
