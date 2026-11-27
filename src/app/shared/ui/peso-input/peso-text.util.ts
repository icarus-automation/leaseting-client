/**
 * Text rules for the peso input. While someone types, the field holds plain
 * digits and one decimal point. It shows grouping and two decimals only once
 * they leave it.
 */

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
