import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Select } from 'primeng/select';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import type { BillListFilters, BillListItem, BillsSummary } from '../../core/models/bill.types';
import type { GridFilters } from '../../core/models/grid-query.types';
import { BILL_TYPE_LABELS, BILL_TYPE_OPTIONS, BillType } from '../../core/models/enums';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { NlFilterBar } from '../../shared/ui/nl-filter-bar/nl-filter-bar';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { SegmentedControl } from '../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { StatusBadge, BadgeTone } from '../../shared/ui/status-badge/status-badge';
import { watchCreateParam } from '../../shared/utils/create-param.util';
import { isPastDue } from '../../shared/utils/date.util';
import { BillFormDialog } from './components/bill-form-dialog/bill-form-dialog';
import { GenerateSoaDialog } from './components/generate-soa-dialog/generate-soa-dialog';
import { RecordPaymentDialog } from './components/record-payment-dialog/record-payment-dialog';
import { BillsService } from './services/bills.service';

/** One-click views over the list; dueToday/overdue are server-derived. */
type QuickFilter = 'all' | 'dueToday' | 'overdue' | 'unpaid' | 'paid';

const QUICK_FILTERS: { label: string; value: QuickFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Due today', value: 'dueToday' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
];

const QUICK_FILTER_PARAMS: Record<QuickFilter, BillListFilters> = {
  all: {},
  dueToday: { dueToday: true },
  overdue: { overdue: true },
  unpaid: { status: 'UNPAID' },
  paid: { status: 'PAID' },
};

const TYPE_OPTIONS: { label: string; value: BillType | null }[] = [
  { label: 'All types', value: null },
  ...BILL_TYPE_OPTIONS,
];

@Component({
  selector: 'app-bills',
  imports: [
    DatePipe,
    RouterLink,
    FormsModule,
    PIcon,
    Select,
    PhpCurrencyPipe,
    EmptyState,
    NlFilterBar,
    Pagination,
    SegmentedControl,
    Skeleton,
    StatusBadge,
    BillFormDialog,
    GenerateSoaDialog,
    RecordPaymentDialog,
  ],
  templateUrl: './bills.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bills {
  private readonly bills = inject(BillsService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canMutateFinance = this.auth.isFinancialAdmin;

  readonly quickFilters = QUICK_FILTERS;
  readonly typeOptions = TYPE_OPTIONS;
  readonly billTypeLabels = BILL_TYPE_LABELS;

  readonly items = signal<BillListItem[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly summary = signal<BillsSummary | null>(null);

  readonly quickFilter = signal<QuickFilter>('all');
  typeFilter: BillType | null = null;
  readonly leaseIdFilter = signal<string | null>(
    this.route.snapshot.queryParamMap.get('leaseId'),
  );
  /** Deep link from the tenant profile — all bills across the tenant's leases. */
  readonly tenantIdFilter = signal<string | null>(
    this.route.snapshot.queryParamMap.get('tenantId'),
  );

  /**
   * Filters produced by the natural-language bar.
   *
   * These and the quick filters are one setting, not two: whichever was used
   * last wins and the other is cleared. Two visible controls that silently
   * intersect is how a manager ends up staring at an empty table with both of
   * them looking switched on.
   */
  readonly nlFilters = signal<GridFilters>({});

  readonly drawerVisible = signal(false);
  readonly paymentDialogVisible = signal(false);
  readonly paymentTarget = signal<BillListItem | null>(null);
  readonly soaDialogVisible = signal(false);
  readonly generatingRent = signal(false);
  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    // Deep link support: ?status=UNPAID preselects the filter (dashboard links).
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status === 'UNPAID') this.quickFilter.set('unpaid');
    if (status === 'PAID') this.quickFilter.set('paid');

    this.load(1);
    this.loadSummary();

    watchCreateParam(() => this.drawerVisible.set(true));

    // Deep links from the palette/dashboard — subscribed (not snapshot) so
    // they also fire when already on this page.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const status = params.get('status');
        const wanted: QuickFilter | null =
          status === 'UNPAID' ? 'unpaid' : status === 'PAID' ? 'paid' : null;
        if (wanted && this.quickFilter() !== wanted) {
          this.quickFilter.set(wanted);
          this.load(1);
        }
        const leaseId = params.get('leaseId');
        if (leaseId && leaseId !== this.leaseIdFilter()) {
          this.leaseIdFilter.set(leaseId);
          this.load(1);
        }
        const tenantId = params.get('tenantId');
        if (tenantId && tenantId !== this.tenantIdFilter()) {
          this.tenantIdFilter.set(tenantId);
          this.load(1);
        }
      });
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.bills
      .list({
        page,
        limit: 10,
        ...QUICK_FILTER_PARAMS[this.quickFilter()],
        type: this.typeFilter ?? undefined,
        ...(this.nlFilters() as BillListFilters),
        // Deep links from a tenant profile or a lease outrank both: the user
        // arrived here asking about one record, and widening that silently
        // would answer a question they did not ask.
        leaseId: this.leaseIdFilter() ?? undefined,
        tenantId: this.tenantIdFilter() ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.data);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load bills.'));
        },
      });
  }

  setQuickFilter(filter: QuickFilter): void {
    if (this.quickFilter() === filter) return;
    this.quickFilter.set(filter);
    this.nlFilters.set({});
    this.load(1);
  }

  /** A new parse from the filter bar — it owns the view from here. */
  onFiltersChange(filters: GridFilters): void {
    this.nlFilters.set(filters);
    if (Object.keys(filters).length > 0) {
      this.quickFilter.set('all');
      this.typeFilter = null;
    }
    this.load(1);
  }

  /** Best-effort — the cards simply stay hidden if the call fails. */
  private loadSummary(): void {
    this.bills
      .summary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.summary.set(summary),
        error: () => this.summary.set(null),
      });
  }

  clearLeaseFilter(): void {
    this.leaseIdFilter.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { leaseId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.load(1);
  }

  clearTenantFilter(): void {
    this.tenantIdFilter.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tenantId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.load(1);
  }

  isOverdue(bill: BillListItem): boolean {
    return bill.status !== 'PAID' && isPastDue(bill.dueDate);
  }

  isPartiallyPaid(bill: BillListItem): boolean {
    return bill.status === 'UNPAID' && Number(bill.paidAmount) > 0;
  }

  statusBadge(bill: BillListItem): { label: string; tone: BadgeTone } {
    if (bill.status === 'PAID') return { label: 'Paid', tone: 'success' };
    if (this.isOverdue(bill)) return { label: 'Overdue', tone: 'destructive' };
    return this.isPartiallyPaid(bill)
      ? { label: 'Partial', tone: 'vacant' }
      : { label: 'Unpaid', tone: 'warning' };
  }

  onSaved(): void {
    this.toast.add({ severity: 'success', summary: 'Bill created' });
    this.load(this.meta()?.page ?? 1);
    this.loadSummary();
  }

  openPaymentDialog(bill: BillListItem): void {
    this.paymentTarget.set(bill);
    this.paymentDialogVisible.set(true);
  }

  onPaymentsChanged(): void {
    this.load(this.meta()?.page ?? 1);
    this.loadSummary();
  }

  /** Manual trigger for the automated rent billing — same idempotent run. */
  generateRentBills(): void {
    if (this.generatingRent()) return;
    this.generatingRent.set(true);
    this.bills
      .rentRun()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ created }) => {
          this.generatingRent.set(false);
          this.toast.add({
            severity: created > 0 ? 'success' : 'info',
            summary:
              created > 0
                ? `${created} rent bill${created === 1 ? '' : 's'} created`
                : 'Rent bills are up to date',
            detail: created > 0 ? undefined : 'Every active lease already has its upcoming rent bill.',
          });
          if (created > 0) {
            this.load(1);
            this.loadSummary();
          }
        },
        error: (error: unknown) => {
          this.generatingRent.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not generate rent bills',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  confirmDelete(bill: BillListItem): void {
    this.confirmation.confirm({
      header: 'Delete bill',
      message: `Delete this unpaid ${BILL_TYPE_LABELS[bill.type]} bill? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.bills
          .delete(bill.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Bill deleted' });
              this.load(this.meta()?.page ?? 1);
              this.loadSummary();
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Cannot delete',
                detail: apiErrorMessage(error, 'Paid bills cannot be deleted.'),
              });
            },
          });
      },
    });
  }
}
