import { FormControl } from '@angular/forms';

import { normalizePersonName, tidyNameField } from './person-name.util';

describe('normalizePersonName', () => {
  it('capitalizes each word of a name typed all in lowercase or all in caps', () => {
    expect(normalizePersonName('andrei  balboa')).toBe('Andrei Balboa');
    expect(normalizePersonName('ANDREI BALBOA')).toBe('Andrei Balboa');
  });

  it('keeps a mixed-case name as typed, with its spaces tidied', () => {
    expect(normalizePersonName('McArthur')).toBe('McArthur');
    expect(normalizePersonName(' dela  Cruz ')).toBe('dela Cruz');
  });

  it('starts a word after a hyphen or an apostrophe, and handles ñ', () => {
    expect(normalizePersonName("mary-jane o'neil")).toBe("Mary-Jane O'Neil");
    expect(normalizePersonName('PEÑA')).toBe('Peña');
  });

  it('matches the API on text with no letters and on blanks', () => {
    expect(normalizePersonName(' 123 ')).toBe('123');
    expect(normalizePersonName('   ')).toBe('');
  });
});

describe('tidyNameField', () => {
  it('writes the saved form back into the field', () => {
    const control = new FormControl('andrei  balboa', { nonNullable: true });
    tidyNameField(control);
    expect(control.value).toBe('Andrei Balboa');
  });

  it('leaves a field that is already tidy untouched', () => {
    const control = new FormControl('dela Cruz', { nonNullable: true });
    const changes: string[] = [];
    control.valueChanges.subscribe((value) => changes.push(value));
    tidyNameField(control);
    expect(changes).toEqual([]);
  });
});
