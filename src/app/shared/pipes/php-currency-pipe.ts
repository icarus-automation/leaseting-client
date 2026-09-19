import { Pipe, PipeTransform } from '@angular/core';

const FORMATTER = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

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
