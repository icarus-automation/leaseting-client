export function finiteAmount(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

