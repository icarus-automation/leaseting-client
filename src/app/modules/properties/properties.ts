import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import type { PropertyListItem, PropertyResponse } from '../../core/models/property.types';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { watchCreateParam } from '../../shared/utils/create-param.util';
import { PropertyCard } from './components/property-card/property-card';
import { PropertyFormDialog } from './components/property-form-dialog/property-form-dialog';
import { PropertiesService } from './services/properties.service';

@Component({
  selector: 'app-properties',
  imports: [PIcon, EmptyState, Pagination, Skeleton, PropertyCard, PropertyFormDialog],
  templateUrl: './properties.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Properties {
  private readonly properties = inject(PropertiesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<PropertyListItem[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly drawerVisible = signal(false);
  readonly editTarget = signal<PropertyListItem | null>(null);

  readonly skeletons = Array.from({ length: 6 });

  constructor() {
    this.load(1);

    watchCreateParam(() => this.openCreate());
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.properties
      .list(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.data);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load properties.'));
        },
      });
  }

  openCreate(): void {
    this.editTarget.set(null);
    this.drawerVisible.set(true);
  }

  openEdit(property: PropertyListItem): void {
    this.editTarget.set(property);
    this.drawerVisible.set(true);
  }

  onSaved(property: PropertyResponse): void {
    this.toast.add({
      severity: 'success',
      summary: this.editTarget() ? 'Property updated' : 'Property created',
      detail: property.name,
    });
    this.load(this.meta()?.page ?? 1);
  }

  confirmArchive(property: PropertyListItem): void {
    this.confirmation.confirm({
      header: 'Archive property',
      message: `Archive ${property.name}? It disappears from lists, but its floors, units, and history are kept.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Archive', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.archive(property),
    });
  }

  private archive(property: PropertyListItem): void {
    this.properties
      .archive(property.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.add({ severity: 'success', summary: 'Property archived' });
          this.load(this.meta()?.page ?? 1);
        },
        error: (error: unknown) => {
          this.toast.add({
            severity: 'error',
            summary: 'Cannot archive',
            detail: apiErrorMessage(error, 'This property still has active leases.'),
          });
        },
      });
  }
}
