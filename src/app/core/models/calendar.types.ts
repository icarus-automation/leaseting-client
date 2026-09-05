export type CalendarEventType = 'LEASE_START' | 'LEASE_END' | 'BILL_DUE' | 'MOVE_IN';
export type CalendarEventStatus =
  | 'UPCOMING' | 'DUE' | 'TODAY' | 'OVERDUE'
  | 'PAID' | 'COMPLETED' | 'TERMINATED' | 'IN_PROGRESS';

export interface CalendarEntry {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string;
  status: CalendarEventStatus;
  statusLabel: string;
  sourceId: string;
  leaseId: string | null;
  property: { id: string; name: string };
  unit: { id: string; unitNo: string };
  tenant: { id: string; name: string } | null;
  amount: string | null;
  balance: string | null;
}

export interface CalendarFeed {
  events: CalendarEntry[];
  today: string;
  timeZone: 'Asia/Manila';
}

export interface CalendarProperty {
  id: string;
  name: string;
  isArchived: boolean;
}
