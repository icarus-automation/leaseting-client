import { Pipe, PipeTransform } from '@angular/core';

const FORMATTER = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

/**
 * Formats backend money values as PHP currency. Backend Decimals serialize as
 * strings, and this is the only place they're parsed to numbers (display only).
 *
 * Exported as a function too, for the places money has to reach a plain string
 * rather than a template: a confirmation dialog's message, a toast. Those used
 * to build their own formatting and drifted from the pipe.
 */
export function formatPhp(value: string | number | null | undefined, fallback = '-'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const amount = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(amount)) return fallback;
  return FORMATTER.format(amount);
}

@Pipe({ name: 'phpCurrency' })
export class PhpCurrencyPipe implements PipeTransform {
  transform(value: string | number | null | undefined, fallback = '-'): string {
    return formatPhp(value, fallback);
  }
}
