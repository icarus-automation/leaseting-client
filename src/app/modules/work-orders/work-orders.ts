import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';
import type { Subscription } from 'rxjs';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import type { StaffMaintenanceRequest } from '../../core/models/maintenance-request.types';
import type { PropertyListItem } from '../../core/models/property.types';
import { OpenRequestsService } from '../../core/work-orders/open-requests.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../shared/ui/error-banner/error-banner';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { SegmentedControl } from '../../shared/ui/segmented-control/segmented-control';
import type { SegmentedOption } from '../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { PropertiesService } from '../properties/services/properties.service';
import { RequestDetailDialog } from './components/request-detail-dialog/request-detail-dialog';
import { MaintenanceRequestsService } from './services/maintenance-requests.service';
import {
  photoCountLabel,
  requestEmptyState,
  requestStatusBadge,
  requestTenantName,
  viewStatus,
} from './utils/maintenance-request.util';
import type { RequestView } from './utils/maintenance-request.util';

const ALL_PROPERTIES = 'all';
const PAGE_SIZE = 20;

@Component({
  selector: 'app-work-orders',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    PIcon,
    Select,
    EmptyState,
    ErrorBanner,
    Pagination,
    SegmentedControl,
    Skeleton,
    StatusBadge,
    RequestDetailDialog,
  ],
  templateUrl: './work-orders.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrders {
  private readonly requestsApi = inject(MaintenanceRequestsService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly openRequests = inject(OpenRequestsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<StaffMaintenanceRequest[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly view = signal<RequestView>('OPEN');
  readonly propertyId = signal(ALL_PROPERTIES);
  readonly properties = signal<PropertyListItem[]>([]);

  readonly detailVisible = signal(false);
  readonly detailRequest = signal<StaffMaintenanceRequest | null>(null);

  readonly skeletons = Array.from({ length: 6 });

  readonly viewOptions: SegmentedOption<RequestView>[] = [
    { value: 'OPEN', label: 'Open' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'RESOLVED', label: 'Resolved' },
    { value: 'ALL', label: 'All' },
  ];

  readonly propertyOptions = computed(() => [
    { label: 'All properties', value: ALL_PROPERTIES },
    ...this.properties().map((property) => ({ label: property.name, value: property.id })),
  ]);

  readonly rows = computed(() =>
    this.items().map((request) => ({
      request,
      badge: requestStatusBadge(request.status),
      tenantName: requestTenantName(request),
      photoCount: request.photoUrls.length,
      photoLabel: photoCountLabel(request.photoUrls.length),
    })),
  );

  readonly emptyState = computed(() =>
    requestEmptyState(this.view(), this.propertyId() !== ALL_PROPERTIES),
  );

  private listSubscription: Subscription | null = null;

  constructor() {
    this.loadProperties();
    this.load(1);
  }

  onViewChange(view: RequestView): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.load(1);
  }

  onPropertyChange(propertyId: string): void {
    this.propertyId.set(propertyId);
    this.load(1);
  }

  openDetail(request: StaffMaintenanceRequest): void {
    this.detailRequest.set(request);
    this.detailVisible.set(true);
  }

  onRequestChanged(): void {
    this.load(this.meta()?.page ?? 1, { quiet: true });
    this.openRequests.refresh();
  }

  refresh(): void {
    this.load(this.meta()?.page ?? 1);
    this.openRequests.refresh();
  }

  load(page: number, { quiet = false } = {}): void {
    this.listSubscription?.unsubscribe();
    if (!quiet) this.loading.set(true);
    this.error.set(null);
    this.listSubscription = this.requestsApi
      .list({ page, limit: PAGE_SIZE, status: viewStatus(this.view()), ...this.scope() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (result.data.length === 0 && result.meta.total > 0 && result.meta.lastPage < page) {
            this.load(result.meta.lastPage, { quiet });
            return;
          }
          this.items.set(result.data);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load maintenance requests.'));
        },
      });
  }

  private loadProperties(): void {
    this.propertiesApi
      .list(1, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.properties.set(page.data),
        error: () => this.properties.set([]),
      });
  }

  private scope(): { propertyId?: string } {
    const propertyId = this.propertyId();
    return propertyId === ALL_PROPERTIES ? {} : { propertyId };
  }
}

