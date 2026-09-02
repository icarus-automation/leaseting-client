import { Pipe, PipeTransform } from '@angular/core';

const FORMATTER = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

/**
 * Formats backend money values as PHP currency. Backend Decimals serialize as
 * strings — this pipe is the only place they're parsed to numbers (display only).
 */
@Pipe({ name: 'phpCurrency' })
export class PhpCurrencyPipe implements PipeTransform {
  transform(value: string | number | null | undefined, fallback = '-'): string {
    if (value === null || value === undefined || value === '') return fallback;
    const amount = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(amount)) return fallback;
    return FORMATTER.format(amount);
  }
}
