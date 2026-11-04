import type { ActivePassRow, ActivePassState, PassPaymentSource } from '../../core/models/report.types';
import type { BadgeTone } from '../../shared/ui/status-badge/status-badge';

export const EXPIRING_WINDOW_DAYS = [3, 7, 14, 30] as const;

export const DEFAULT_EXPIRING_WINDOW = 7;

export const PASS_STATE_FILTERS: { value: ActivePassState | 'all'; label: string }[] = [
  { value: 'all', label: 'Every pass' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'lapsed', label: 'Lapsed' },
  { value: 'active', label: 'Active' },
];

export const PASS_PAYMENT_SOURCE_LABELS: Record<PassPaymentSource, string> = {
  terminal: 'Terminal',
  office: 'Office',
  bill: 'Through a bill',
};

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** Days are counted against the last day the pass still covers: paid-through plus grace. */
export function passStateBadge(row: Pick<ActivePassRow, 'state' | 'daysLeft'>): { tone: BadgeTone; label: string } {
  if (row.state === 'lapsed') {
    return { tone: 'destructive', label: row.daysLeft === -1 ? 'Lapsed yesterday' : `Lapsed ${plural(-row.daysLeft, 'day')} ago` };
  }
  if (row.state === 'expiring') {
    if (row.daysLeft === 0) return { tone: 'warning', label: 'Ends today' };
    if (row.daysLeft === 1) return { tone: 'warning', label: 'Ends tomorrow' };
    return { tone: 'warning', label: `Ends in ${plural(row.daysLeft, 'day')}` };
  }
  return { tone: 'success', label: 'Active' };
}
