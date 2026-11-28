/**
 * Text rules for the peso input. While someone types, the field holds plain
 * digits and one decimal point. It shows grouping and two decimals only once
 * they leave it.
 */

import type { AbstractControl } from '@angular/forms';

/**
 * The most any peso field takes. The API answers 400 above it. A field can still hold
 * more, as typed or pasted, so the person sees the error instead of a clipped amount.
 */
export const MAX_PESO_AMOUNT = 99_999_999.99;

/** The error a peso field sets above MAX_PESO_AMOUNT. The field shows PESO_MAX_MESSAGE itself. */
export const PESO_MAX_ERROR = 'pesoMax';

export const PESO_MAX_MESSAGE = 'Max ₱99,999,999.99';

/** Twelve whole digits (₱999 billion) keeps every value an exact JS number. */
const MAX_WHOLE_DIGITS = 12;
const VALID_DRAFT = new RegExp(`^\\d{0,${MAX_WHOLE_DIGITS}}(\\.\\d{0,2})?$`);

const DISPLAY = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true,
});

/** Drops anything that isn't a digit or a point: ₱, commas, spaces, letters. */
export function stripPesoText(text: string): string {
  return text.replace(/[^\d.]/g, '');
}

/** Whether `text` is something a person could be halfway through typing. */
export function isPesoDraft(text: string): boolean {
  return VALID_DRAFT.test(text);
}

/**
 * Forces pasted or dropped text into a draft: keeps the first point, cuts the
 * cents to two digits and the whole part to the maximum.
 */
export function normalizePesoText(text: string): string {
  const stripped = stripPesoText(text);
  const point = stripped.indexOf('.');
  const whole = (point === -1 ? stripped : stripped.slice(0, point)).slice(0, MAX_WHOLE_DIGITS);
  if (point === -1) return whole;
  const cents = stripped.slice(point + 1).replace(/\./g, '').slice(0, 2);
  return `${whole}.${cents}`;
}

/** The amount a draft stands for. Blank, or a bare point, is no amount at all. */
export function parsePesoText(text: string): number | null {
  const stripped = stripPesoText(text);
  if (stripped === '' || stripped === '.') return null;
  const amount = Number(stripped);
  return Number.isFinite(amount) ? amount : null;
}

/** A form value as an amount: numbers pass, numeric strings (API decimals) are read. */
export function toPesoAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : null;
  }
  return null;
}

/** What the field shows at rest: `12,000.50`, or nothing. */
export function formatPesoDisplay(amount: number | null): string {
  return amount === null ? '' : DISPLAY.format(amount);
}

/** What the field holds while focused: `12000.50`, ready to retype or edit. */
export function formatPesoDraft(amount: number | null): string {
  return amount === null ? '' : amount.toFixed(2);
}

/** Whether a control, or any control inside a group or array, holds an amount over the cap. */
export function hasPesoOverMax(control: AbstractControl): boolean {
  if (control.hasError(PESO_MAX_ERROR)) return true;
  const children = (control as { controls?: Record<string, AbstractControl> | AbstractControl[] }).controls;
  return children ? Object.values(children).some(hasPesoOverMax) : false;
}
