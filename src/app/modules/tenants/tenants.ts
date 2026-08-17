import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import { ONBOARDING_STEP_LABELS, ONBOARDING_STEP_ORDER } from '../../core/models/onboarding.types';
import type { OnboardingListItem } from '../../core/models/onboarding.types';
import type { TenantResponse } from '../../core/models/tenant.types';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { watchCreateParam } from '../../shared/utils/create-param.util';
import { TenantFormDialog } from './components/tenant-form-dialog/tenant-form-dialog';
import { OnboardingsService } from './services/onboardings.service';
import { TenantsService } from './services/tenants.service';

@Component({
  selector: 'app-tenants',
  imports: [DatePipe, RouterLink, PIcon, EmptyState, Pagination, Skeleton, TenantFormDialog],
  templateUrl: './tenants.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tenants {
  private readonly tenants = inject(TenantsService);
  private readonly onboardings = inject(OnboardingsService);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<TenantResponse[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  /** Row to flash after a create/update so the user sees where it landed. */
  readonly flashId = signal<string | null>(null);

  readonly search = signal('');
  /** Debounced copy of the search box — drives the actual requests. */
  private readonly debouncedSearch = toSignal(
    toObservable(this.search).pipe(debounceTime(300), distinctUntilChanged()),
    { initialValue: '' },
  );

  readonly drawerVisible = signal(false);
  readonly editTarget = signal<TenantResponse | null>(null);

  /** Resumable move-in wizards — rendered as a strip above the table. */
  readonly inProgressOnboardings = signal<OnboardingListItem[]>([]);
  readonly startingOnboarding = signal(false);

  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    effect(() => {
      const q = this.debouncedSearch();
      this.load(1, q);
    });

    // "New tenant" entry points (palette, dashboard) now start an onboarding.
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
    this.confirmation.confirm({
      header: 'Cancel onboarding?',
      message: `Stop onboarding ${who}? Progress is discarded, but the tenant and uploaded documents are kept.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Cancel onboarding', severity: 'danger' },
      rejectButtonProps: { label: 'Keep it', severity: 'secondary', outlined: true },
      accept: () => {
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
        // Non-blocking decoration — the tenants table must not fail with it.
        error: () => this.inProgressOnboardings.set([]),
      });
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  load(page: number, q = this.debouncedSearch()): void {
    this.loading.set(true);
    this.error.set(null);
    this.tenants
      .list({ page, limit: 10, q: q.trim() || undefined })
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
    this.confirmation.confirm({
      header: 'Archive tenant',
      message: `Archive ${tenant.firstName} ${tenant.lastName}? They disappear from this list, but their lease and payment history is kept.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Archive', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
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
