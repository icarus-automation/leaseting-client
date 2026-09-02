/**
 * The report catalog: the single source of truth for what reporting exists,
 * what is live, and what is still owed.
 *
 * A report ships by flipping `route` from null to its path. Entries stay
 * listed while unbuilt on purpose: a manager who can see that "Lease
 * Expirations" is planned stops rebuilding it in a spreadsheet, and the list
 * doubles as the roadmap. `blockedBy` names the feature standing in the way so
 * "Soon" never has to be taken on faith.
 */

export type ReportGroupKey =
  | 'business-overview'
  | 'revenue'
  | 'receivables'
  | 'portfolio'
  | 'utilities'
  | 'documents'
  | 'parking';

export interface ReportGroup {
  key: ReportGroupKey;
  label: string;
  description: string;
}

export interface ReportEntry {
  /** Stable id. Persisted in favorites, so never renumber or reuse one. */
  key: string;
  title: string;
  summary: string;
  group: ReportGroupKey;
  icon: string;
  /** Path under /reports, or null while the report is unbuilt. */
  route: string | null;
  /** Feature the report waits on. Rendered on the card when unbuilt. */
  blockedBy?: string;
  /** Extra search terms: old names, accounting jargon, synonyms. */
  keywords: string;
}

export const REPORT_GROUPS: ReportGroup[] = [
  {
    key: 'business-overview',
    label: 'Business Overview',
    description: 'How the portfolio is doing overall.',
  },
  {
    key: 'revenue',
    label: 'Revenue',
    description: 'What was charged and what came in.',
  },
  {
    key: 'receivables',
    label: 'Who Owes You',
    description: 'Outstanding balances and how late they are.',
  },
  {
    key: 'portfolio',
    label: 'Portfolio & Leases',
    description: 'Units, occupancy, and lease timelines.',
  },
  {
    key: 'utilities',
    label: 'Utilities',
    description: 'Meter readings, consumption, and billing runs.',
  },
  {
    key: 'documents',
    label: 'Documents & Audit',
    description: 'What was issued, sent, and by whom.',
  },
  {
    key: 'parking',
    label: 'Parking',
    description: 'Parking income, customers, payments, and unpaid fees.',
  },
];

export const REPORT_ENTRIES: ReportEntry[] = [
  // ── Business Overview ──────────────────────────────────
  {
    key: 'portfolio-overview',
    title: 'Portfolio Overview',
    summary: 'Collections trend, overdue aging, and occupancy across every property.',
    group: 'business-overview',
    icon: 'chart-bar',
    route: 'portfolio-overview',
    keywords: 'dashboard summary kpi collections occupancy aging analytics',
  },
  {
    key: 'profit-and-loss',
    title: 'Profit & Loss',
    summary: 'What is left after costs over a period, per property and across the portfolio.',
    group: 'business-overview',
    icon: 'chart-line',
    route: null,
    blockedBy: 'Expenses',
    keywords: 'p&l pnl income statement earnings net profit loss',
  },
  {
    key: 'cash-flow',
    title: 'Cash Flow Summary',
    summary: 'Money in against money out, month by month, with what is left at the end.',
    group: 'business-overview',
    icon: 'money-bill',
    route: null,
    blockedBy: 'Expenses',
    keywords: 'cashflow liquidity in out net movement',
  },
  {
    key: 'owner-statement',
    title: 'Owner Statement',
    summary: 'What each owner earned, what it cost, and the management fee for a period.',
    group: 'business-overview',
    icon: 'briefcase',
    route: null,
    blockedBy: 'Expenses, Owners',
    keywords: 'landlord remittance disbursement payout fee',
  },

  // ── Revenue ────────────────────────────────────────────
  {
    key: 'revenue-by-tenant',
    title: 'Money In, by Tenant',
    summary: 'Every charge raised and every payment received in a period, grouped by tenant.',
    group: 'revenue',
    icon: 'users',
    route: 'revenue-by-tenant',
    keywords: 'revenue by tenant sales by customer details customer transactions billed collected ledger',
  },
  {
    key: 'rent-roll',
    title: 'Rent Roll',
    summary: 'Every active lease with its agreed rent, next due date, and what is still owed.',
    group: 'revenue',
    icon: 'list',
    route: null,
    keywords: 'active leases schedule contracted rent tenancy roll',
  },
  {
    key: 'bill-register',
    title: 'Bill Register',
    summary: 'Every bill raised, in the order it was raised. The audit trail behind the totals.',
    group: 'revenue',
    icon: 'file-edit',
    route: null,
    keywords: 'transaction details journal charges raised invoices audit',
  },
  {
    key: 'payment-register',
    title: 'Payment Register',
    summary: 'Every payment received, with method, reference number, and receipt.',
    group: 'revenue',
    icon: 'wallet',
    route: null,
    keywords: 'collections received cash gcash bank transfer receipts',
  },
  {
    key: 'deposits-held',
    title: 'Deposits Held',
    summary: 'Security and advance deposits currently held, per tenant and lease.',
    group: 'revenue',
    icon: 'lock',
    route: null,
    blockedBy: 'Deposit tracking',
    keywords: 'security advance bond liability refundable',
  },

  // ── Who Owes You ───────────────────────────────────────
  {
    key: 'ar-aging-summary',
    title: 'Who Owes What',
    summary: 'What each tenant still owes, split by how long it has been sitting unpaid.',
    group: 'receivables',
    icon: 'chart-pie',
    route: 'ar-aging-summary',
    keywords: 'ar aging accounts receivable buckets summary by tenant arrears who owes 1-30 31-60 61-90 90+',
  },
  {
    key: 'ar-aging-detail',
    title: 'Unpaid Bills',
    summary: 'Every open bill, how many days it is past due, and what is left to collect.',
    group: 'receivables',
    icon: 'exclamation-circle',
    route: 'ar-aging-detail',
    keywords: 'ar aging detail accounts receivable overdue arrears past due buckets worklist chase list',
  },
  {
    key: 'delinquency',
    title: 'Late Payers & Reminders',
    summary: 'Tenants who are late again and again, next to the reminders already sent to them.',
    group: 'receivables',
    icon: 'bell',
    route: 'delinquency',
    keywords: 'delinquency late payers sms reminder ladder escalation collections chase repeat offenders',
  },

  // ── Portfolio & Leases ─────────────────────────────────
  {
    key: 'occupancy-by-property',
    title: 'Occupancy by Property',
    summary: 'How many units are filled per property, and how that has moved over time.',
    group: 'portfolio',
    icon: 'building',
    route: null,
    keywords: 'vacancy rate utilization filled units',
  },
  {
    key: 'vacant-units',
    title: 'Vacant Units',
    summary: 'Units with nobody in them, how long they have been empty, and the asking rent.',
    group: 'portfolio',
    icon: 'home',
    route: null,
    keywords: 'available empty unleased downtime days vacant',
  },
  {
    key: 'lease-expirations',
    title: 'Lease Expirations',
    summary: 'Leases ending in the next 30 / 60 / 90 days, so renewals start on time.',
    group: 'portfolio',
    icon: 'calendar',
    route: null,
    keywords: 'renewals expiring ending term rollover',
  },
  {
    key: 'tenant-directory',
    title: 'Tenant Directory',
    summary: 'Current tenants with their unit, contact details, and lease dates.',
    group: 'portfolio',
    icon: 'id-card',
    route: null,
    keywords: 'current tenants contact list roster assignment who lives where',
  },
  {
    key: 'move-in-move-out',
    title: 'Move-ins & Move-outs',
    summary: 'Who moved in, who moved out, and how long each room took to fill again.',
    group: 'portfolio',
    icon: 'sign-in',
    route: null,
    keywords: 'turnover churn onboarding pipeline move out turnaround',
  },

  // ── Utilities ──────────────────────────────────────────
  {
    key: 'utility-consumption',
    title: 'Utility Consumption by Unit',
    summary: 'Meter readings and consumption per unit, month over month.',
    group: 'utilities',
    icon: 'bolt',
    route: null,
    keywords: 'electricity water meter reading kwh usage submeter',
  },
  {
    key: 'utility-run-summary',
    title: 'Utility Billing Run Summary',
    summary: 'What each billing run charged, including the handling fee, VAT, and withholding.',
    group: 'utilities',
    icon: 'calculator',
    route: null,
    keywords: 'billing run recovery variance admin fee vat wht reconciliation',
  },

  // ── Documents & Audit ──────────────────────────────────
  {
    key: 'soa-issued',
    title: 'Statements Issued',
    summary: 'Every statement of account generated, its total, and whether the text was delivered.',
    group: 'documents',
    icon: 'file-excel',
    route: null,
    keywords: 'soa statement of account sent sms audit trail issued',
  },

  // ── Parking ────────────────────────────────────────────
  {
    key: 'parking-revenue',
    title: 'Parking Revenue',
    summary: 'Income from parking assignments, per property and per period.',
    group: 'parking',
    icon: 'chart-line',
    route: null,
    blockedBy: 'parking management records',
    keywords: 'slot spot bay stall income',
  },
  {
    key: 'monthly-parking-customers',
    title: 'Monthly Parking Customers',
    summary: 'Customers on a monthly plan, with their assigned space, vehicle, and current rate.',
    group: 'parking',
    icon: 'users',
    route: null,
    blockedBy: 'parking management records',
    keywords: 'monthly parker customer recurring plan assignment vehicle rate',
  },
  {
    key: 'parking-history-by-tenant',
    title: 'Parking Payments by Tenant',
    summary: 'Parking charges and payments grouped under each tenant.',
    group: 'parking',
    icon: 'wallet',
    route: null,
    blockedBy: 'parking management records',
    keywords: 'parking payment history by tenant slot spot',
  },
  {
    key: 'parking-delinquency',
    title: 'Unpaid Parking Fees',
    summary: 'Customers with unpaid parking charges and how far past due they are.',
    group: 'parking',
    icon: 'exclamation-circle',
    route: null,
    blockedBy: 'parking management records',
    keywords: 'parking delinquency overdue arrears unpaid late fees slot',
  },
];

/** True when the report can actually be opened. */
export function isAvailable(entry: ReportEntry): boolean {
  return entry.route !== null;
}
