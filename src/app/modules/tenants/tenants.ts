import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import { ONBOARDING_STEP_LABELS, ONBOARDING_STEP_ORDER } from '../../core/models/onboarding.types';
import type { OnboardingListItem } from '../../core/models/onboarding.types';
import type { GridFilters } from '../../core/models/grid-query.types';
import type { TenantListFilters, TenantListItem, TenantResponse } from '../../core/models/tenant.types';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { NlFilterBar } from '../../shared/ui/nl-filter-bar/nl-filter-bar';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { BadgeTone, StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { watchCreateParam } from '../../shared/utils/create-param.util';
import { TenantFormDialog } from './components/tenant-form-dialog/tenant-form-dialog';
import { OnboardingsService } from './services/onboardings.service';
import { TenantsService } from './services/tenants.service';

@Component({
  selector: 'app-tenants',
  imports: [
    DatePipe,
    RouterLink,
    PIcon,
    PhpCurrencyPipe,
    EmptyState,
    NlFilterBar,
    Pagination,
    Skeleton,
    StatusBadge,
    TenantFormDialog,
  ],
  templateUrl: './tenants.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tenants {
  private readonly tenants = inject(TenantsService);
  private readonly onboardings = inject(OnboardingsService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<TenantListItem[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);

  readonly filters = signal<GridFilters>({});
  readonly isFiltered = computed(() => Object.keys(this.filters()).length > 0);

  readonly drawerVisible = signal(false);
  readonly editTarget = signal<TenantResponse | null>(null);

  readonly inProgressOnboardings = signal<OnboardingListItem[]>([]);
  readonly startingOnboarding = signal(false);

  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    this.load(1);

    watchCreateParam(() => this.startOnboarding());
    this.loadOnboardings();
  }

  onboardingStepChip(item: OnboardingListItem): string {
    const index = ONBOARDING_STEP_ORDER.indexOf(item.currentStepKey) + 1;
    return `Step ${index}/${item.totalSteps} · ${ONBOARDING_STEP_LABELS[item.currentStepKey]}`;
  }

  startOnboarding(): void {
    this.startingOnboarding.set(true);
    this.onboardings
      .create()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (onboarding) => {
          this.startingOnboarding.set(false);
          void this.router.navigate(['/tenants/onboarding', onboarding.id]);
        },
        error: (error: unknown) => {
          this.startingOnboarding.set(false);
          this.toast.add({
            severity: 'error',
            summary: 'Could not start onboarding',
            detail: apiErrorMessage(error, 'Try again.'),
          });
        },
      });
  }

  confirmCancelOnboarding(item: OnboardingListItem): void {
    const who = item.tenant ? `${item.tenant.firstName} ${item.tenant.lastName}` : 'this onboarding';
    this.confirm.danger({
      header: 'Cancel onboarding?',
      message: `Stop onboarding ${who}? Progress is discarded, but the tenant and uploaded documents are kept.`,
      acceptLabel: 'Cancel onboarding',
      rejectLabel: 'Keep it',
      onAccept: () => {
        this.onboardings
          .cancel(item.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'info', summary: 'Onboarding cancelled' });
              this.loadOnboardings();
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Cannot cancel',
                detail: apiErrorMessage(error, 'Try again.'),
              });
            },
          });
      },
    });
  }

  private loadOnboardings(): void {
    this.onboardings
      .list('IN_PROGRESS')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.inProgressOnboardings.set(items),
        error: () => this.inProgressOnboardings.set([]),
      });
  }

  onFiltersChange(filters: GridFilters): void {
    this.filters.set(filters);
    this.load(1);
  }

  balanceTone(tenant: TenantListItem): BadgeTone {
    if (tenant.maxDaysOverdue > 0) return 'destructive';
    return 'warning';
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.tenants
      .list({ ...(this.filters() as TenantListFilters), page, limit: 10 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.data);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load tenants.'));
        },
      });
  }

  openEdit(tenant: TenantResponse): void {
    this.editTarget.set(tenant);
    this.drawerVisible.set(true);
  }

  onSaved(tenant: TenantResponse): void {
    this.toast.add({
      severity: 'success',
      summary: 'Tenant updated',
      detail: `${tenant.firstName} ${tenant.lastName}`,
    });
    this.flashId.set(tenant.id);
    this.load(this.meta()?.page ?? 1);
  }

  confirmArchive(tenant: TenantResponse): void {
    this.confirm.danger({
      header: 'Archive tenant',
      message: `Archive ${tenant.firstName} ${tenant.lastName}? They disappear from this list, but their lease and payment history is kept.`,
      acceptLabel: 'Archive',
      onAccept: () => {
        this.tenants
          .archive(tenant.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'success', summary: 'Tenant archived' });
              this.load(this.meta()?.page ?? 1);
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Cannot archive',
                detail: apiErrorMessage(error, 'This tenant still has an active lease.'),
              });
            },
          });
      },
    });
  }
}
