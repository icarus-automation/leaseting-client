import type { BadgeTone } from '../ui/status-badge/status-badge';

export interface LeaseStatusLike {
  startDate: string;
  endDate: string;
  terminatedAt: string | null;
}

export interface LeaseStatusResult {
  label: 'Terminated' | 'Ended' | 'Upcoming' | 'Active';
  tone: BadgeTone;
}

/** Single source of the lease lifecycle label (was duplicated per page). */
export function leaseStatus(lease: LeaseStatusLike): LeaseStatusResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (lease.terminatedAt) return { label: 'Terminated', tone: 'destructive' };
  if (new Date(lease.endDate) < today) return { label: 'Ended', tone: 'neutral' };
  if (new Date(lease.startDate) > today) return { label: 'Upcoming', tone: 'warning' };
  return { label: 'Active', tone: 'success' };
}

/** True while the lease is the tenant's live contract. */
export function isLeaseActive(lease: LeaseStatusLike): boolean {
  return leaseStatus(lease).label === 'Active';
}
