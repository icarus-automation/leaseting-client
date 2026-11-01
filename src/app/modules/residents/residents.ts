import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import { ONBOARDING_STEP_LABELS, ONBOARDING_STEP_ORDER } from '../../core/models/onboarding.types';
import type { OnboardingListItem } from '../../core/models/onboarding.types';
import type { GridFilters } from '../../core/models/grid-query.types';
import type { ResidentListFilters, ResidentListItem, ResidentResponse } from '../../core/models/resident.types';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { NlFilterBar } from '../../shared/ui/nl-filter-bar/nl-filter-bar';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { BadgeTone, StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { watchCreateParam } from '../../shared/utils/create-param.util';
import { ResidentFormDialog } from './components/resident-form-dialog/resident-form-dialog';
import { OnboardingsService } from './services/onboardings.service';
import { ResidentsService } from './services/residents.service';

@Component({
  selector: 'app-residents',
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
    ResidentFormDialog,
  ],
  templateUrl: './residents.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Residents {
  private readonly residents = inject(ResidentsService);
  private readonly onboardings = inject(OnboardingsService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canManage = computed(() => this.auth.can('residents:manage'));
  /** The onboarding wizard writes the resident as well as the lease. */
  readonly canOnboard = computed(() => this.auth.canAll(['leases:manage', 'residents:manage']));

  readonly items = signal<ResidentListItem[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);

  readonly filters = signal<GridFilters>({});
  readonly isFiltered = computed(() => Object.keys(this.filters()).length > 0);

  readonly drawerVisible = signal(false);
  readonly editTarget = signal<ResidentResponse | null>(null);

  readonly inProgressOnboardings = signal<OnboardingListItem[]>([]);
  readonly startingOnboarding = signal(false);

  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    this.load(1);

    watchCreateParam(() => {
      if (this.canOnboard()) this.startOnboarding();
    });
    if (this.canOnboard()) this.loadOnboardings();
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
          void this.router.navigate(['/residents/onboarding', onboarding.id]);
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
    const who = item.resident ? `${item.resident.firstName} ${item.resident.lastName}` : 'this onboarding';
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

  balanceTone(resident: ResidentListItem): BadgeTone {
    if (resident.maxDaysOverdue > 0) return 'destructive';
    return 'warning';
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.residents
      .list({ ...(this.filters() as ResidentListFilters), page, limit: 10 })
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

  openEdit(resident: ResidentResponse): void {
    this.editTarget.set(resident);
    this.drawerVisible.set(true);
  }

  onSaved(resident: ResidentResponse): void {
    this.toast.add({
      severity: 'success',
      summary: 'Tenant updated',
      detail: `${resident.firstName} ${resident.lastName}`,
    });
    this.flashId.set(resident.id);
    this.load(this.meta()?.page ?? 1);
  }

  confirmArchive(resident: ResidentResponse): void {
    this.confirm.danger({
      header: 'Archive tenant',
      message: `Archive ${resident.firstName} ${resident.lastName}? They disappear from this list, but their lease and payment history is kept.`,
      acceptLabel: 'Archive',
      onAccept: () => {
        this.residents
          .archive(resident.id)
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
