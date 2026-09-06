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
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';
import { forkJoin } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ParkingTerminalResponse } from '../../../../core/models/parking-terminal.types';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { PropertiesService } from '../../../properties/services/properties.service';
import { ParkingTerminalsService } from '../../services/parking-terminals.service';

/**
 * Settings → Terminals. A named handheld bound to one property (Brickstone →
 * Basement). Disable takes it off the floor; delete removes the row.
 */
@Component({
  selector: 'app-parking-terminal-settings',
  imports: [ReactiveFormsModule, RouterLink, PIcon, Select, Skeleton, StatusBadge],
  templateUrl: './parking-terminal-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingTerminalSettings {
  private readonly fb = inject(FormBuilder);
  private readonly terminalsApi = inject(ParkingTerminalsService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<ParkingTerminalResponse[] | null>(null);
  readonly properties = signal<PropertyListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.items() === null && this.error() === null);

  readonly filterControl = new FormControl('all', { nonNullable: true });
  readonly filterPropertyId = toSignal(this.filterControl.valueChanges, { initialValue: 'all' });
  readonly propertyOptions = computed(() =>
    this.properties().map((property) => ({ label: property.name, value: property.id })),
  );
  readonly filterOptions = computed(() => [
    { label: 'All properties', value: 'all' },
    ...this.propertyOptions(),
  ]);

  readonly visibleItems = computed(() => {
    const propertyId = this.filterPropertyId();
    const list = this.items() ?? [];
    return propertyId === 'all' ? list : list.filter((item) => item.propertyId === propertyId);
  });

  readonly createForm = this.buildForm();
  readonly creating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly editForm = this.buildForm();
  readonly editingId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly editError = signal<string | null>(null);

  readonly busyId = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);

  private readonly editInput = viewChild<ElementRef<HTMLInputElement>>('editInput');

  constructor() {
    this.load();
  }

  load(): void {
    this.items.set(null);
    this.error.set(null);
    forkJoin({
      terminals: this.terminalsApi.list(),
      properties: this.propertiesApi.list(1, 50),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ terminals, properties }) => {
          this.items.set(terminals);
          this.properties.set(properties.data);
        },
        error: (error: unknown) =>
          this.error.set(apiErrorMessage(error, 'Could not load terminals.')),
      });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createError.set('Name the terminal and pick a property.');
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.createError.set(null);
    const { name, propertyId } = this.createForm.getRawValue();
    this.terminalsApi
      .create({ name: name.trim(), propertyId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.createForm.reset({ name: '', propertyId: '' });
          this.replaceItem(created);
          this.flashId.set(created.id);
        },
        error: (error: unknown) => {
          this.creating.set(false);
          this.createError.set(apiErrorMessage(error, 'Could not add the terminal.'));
        },
      });
  }

  startEdit(item: ParkingTerminalResponse): void {
    this.editForm.reset({ name: item.name, propertyId: item.propertyId });
    this.editingId.set(item.id);
    this.editError.set(null);
    queueMicrotask(() => this.editInput()?.nativeElement.focus());
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editError.set(null);
  }

  submitEdit(): void {
    const id = this.editingId();
    if (!id) return;
    if (this.editForm.invalid) {
      this.editError.set('Name the terminal and pick a property.');
      return;
    }
    this.saving.set(true);
    this.editError.set(null);
    const { name, propertyId } = this.editForm.getRawValue();
    this.terminalsApi
      .update(id, { name: name.trim(), propertyId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.editingId.set(null);
          this.replaceItem(updated);
          this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.editError.set(apiErrorMessage(error, 'Could not save the terminal.'));
        },
      });
  }

  setActive(item: ParkingTerminalResponse, isActive: boolean): void {
    this.busyId.set(item.id);
    this.terminalsApi
      .update(item.id, { isActive })
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
            summary: isActive ? 'Enable failed' : 'Disable failed',
            detail: apiErrorMessage(error, 'Could not update the terminal.'),
          });
        },
      });
  }

  confirmDelete(item: ParkingTerminalResponse): void {
    this.confirmation.confirm({
      header: 'Delete terminal',
      message: `Delete “${item.name}” at ${item.propertyName}? This cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => this.delete(item),
    });
  }

  private delete(item: ParkingTerminalResponse): void {
    this.busyId.set(item.id);
    this.terminalsApi
      .delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.items.update((items) => (items ?? []).filter((existing) => existing.id !== item.id));
          this.toast.add({ severity: 'success', summary: 'Terminal deleted' });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Delete failed',
            detail: apiErrorMessage(error, 'Could not delete the terminal.'),
          });
        },
      });
  }

  private buildForm() {
    return this.fb.nonNullable.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
      propertyId: ['', [Validators.required]],
    });
  }

  private replaceItem(item: ParkingTerminalResponse): void {
    this.items.update((items) =>
      sortTerminals([...(items ?? []).filter((existing) => existing.id !== item.id), item]),
    );
  }
}

function sortTerminals(rows: ParkingTerminalResponse[]): ParkingTerminalResponse[] {
  return [...rows].sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) ||
      a.propertyName.localeCompare(b.propertyName) ||
      a.name.localeCompare(b.name),
  );
}
