import type { BillListItem, BillSourceSummary } from '../../core/models/bill.types';

/** The resident/unit behind either supported bill source. */
export function billSourceOf(bill: Pick<BillListItem, 'lease' | 'ownership'>): BillSourceSummary {
  const source = bill.lease ?? bill.ownership;
  if (!source) throw new Error('Bill has no billing source');
  return source;
}
