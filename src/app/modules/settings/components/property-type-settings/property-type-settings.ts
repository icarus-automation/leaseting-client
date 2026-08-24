import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PropertyTypeResponse } from '../../../../core/models/property-type.types';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { sortLookupRows } from '../../../../shared/utils/lookup-order.util';
import { PropertyTypesService } from '../../services/property-types.service';

@Component({
  selector: 'app-property-type-settings',
  imports: [PIcon, Skeleton, StatusBadge],
  templateUrl: './property-type-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyTypeSettings {
  private readonly propertyTypes = inject(PropertyTypesService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<PropertyTypeResponse[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.items() === null && this.error() === null);

  readonly newName = signal('');
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly editingId = signal<string | null>(null);
  readonly editName = signal('');
  readonly renaming = signal(false);
  readonly renameError = signal<string | null>(null);

  /** Row currently waiting on an archive/restore round-trip. */
  readonly busyId = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);

  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('renameInput');

  constructor() {
    this.load();
  }

  load(): void {
    this.items.set(null);
    this.error.set(null);
    this.propertyTypes
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.items.set(items),
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load property types.')),
      });
  }

  usageLabel(item: PropertyTypeResponse): string {
    if (item.propertyCount === 0) return 'Not used';
    return item.propertyCount === 1 ? '1 property' : `${item.propertyCount} properties`;
  }

  submitCreate(): void {
    const name = this.newName().trim();
    if (name.length < 2) {
      this.createError.set('Use at least 2 characters.');
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.propertyTypes
      .create(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.newName.set('');
          this.replaceItem(created);
          this.flashId.set(created.id);
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(apiErrorMessage(error, 'Could not add the type.'));
        },
      });
  }

  startRename(item: PropertyTypeResponse): void {
    this.editingId.set(item.id);
    this.editName.set(item.name);
    this.renameError.set(null);
    // The input renders on the next change-detection pass.
    queueMicrotask(() => this.renameInput()?.nativeElement.focus());
  }

  cancelRename(): void {
    this.editingId.set(null);
    this.renameError.set(null);
  }

  submitRename(): void {
    const id = this.editingId();
    if (!id) return;
    const name = this.editName().trim();
    if (name.length < 2) {
      this.renameError.set('Use at least 2 characters.');
      return;
    }

    this.renaming.set(true);
    this.renameError.set(null);
    this.propertyTypes
      .rename(id, name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.renaming.set(false);
          this.editingId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.renaming.set(false);
          this.renameError.set(apiErrorMessage(error, 'Could not rename the type.'));
        },
      });
  }

  confirmArchive(item: PropertyTypeResponse): void {
    if (item.propertyCount === 0) {
      this.archive(item);
      return;
    }
    this.confirmation.confirm({
      header: 'Archive property type',
      message: `Archive “${item.name}”? The ${this.usageLabel(item)} using it keep the label — it just leaves the picker for new properties.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Archive', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.archive(item),
    });
  }

  restore(item: PropertyTypeResponse): void {
    this.busyId.set(item.id);
    this.propertyTypes
      .restore(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Restore failed',
            detail: apiErrorMessage(error, 'Could not restore the type.'),
          });
        },
      });
  }

  private archive(item: PropertyTypeResponse): void {
    this.busyId.set(item.id);
    this.propertyTypes
      .archive(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replaceItem(updated);
          this.toast.add({ severity: 'success', summary: 'Property type archived' });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Archive failed',
            detail: apiErrorMessage(error, 'Could not archive the type.'),
          });
        },
      });
  }

  /** Insert or update, keeping the order the server would have returned. */
  private replaceItem(item: PropertyTypeResponse): void {
    this.items.update((items) =>
      sortLookupRows([...(items ?? []).filter((existing) => existing.id !== item.id), item]),
    );
  }
}
