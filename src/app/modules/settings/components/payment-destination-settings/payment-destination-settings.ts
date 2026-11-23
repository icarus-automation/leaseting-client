import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import type { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { Menu } from 'primeng/menu';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PaymentDestinationResponse } from '../../../../core/models/payment-destination.types';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { showPopupMenu } from '../../../../shared/utils/popup-menu.util';
import {
  destinationAccountLine,
  destinationHolder,
  destinationKindLabel,
  destinationMaskedNumber,
} from '../../../../shared/utils/payment-destination.util';
import { PropertiesService } from '../../../properties/services/properties.service';
import { PaymentDestinationsService } from '../../services/payment-destinations.service';
import {
  groupDestinationsByScope,
  ORGANIZATION_FALLBACK_LABEL,
  reorderedSiblings,
} from '../../utils/destination-scope.util';
import { PaymentDestinationDialog } from '../payment-destination-dialog/payment-destination-dialog';

/**
 * Payment destinations by property, organization fallback last. Add and Edit open one
 * modal; each row's menu views the QR, edits, turns it on or off, and moves it.
 */
@Component({
  selector: 'app-payment-destination-settings',
  imports: [
    PIcon,
    Menu,
    EmptyState,
    ErrorBanner,
    FormDialog,
    PrivateImage,
    Skeleton,
    StatusBadge,
    PaymentDestinationDialog,
  ],
  templateUrl: './payment-destination-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDestinationSettings {
  private readonly destinationsApi = inject(PaymentDestinationsService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canMutate = computed(() => this.auth.can('payment_destinations:manage'));
  /**
   * An organization fallback reaches every property's residents, so changing
   * one takes every property; someone limited changes their properties' only.
   */
  readonly canMutateFallback = computed(() => this.canMutate() && this.auth.hasEveryProperty());

  readonly destinations = signal<PaymentDestinationResponse[] | null>(null);
  readonly properties = signal<PropertyListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.destinations() === null && this.error() === null);
  readonly groups = computed(() =>
    groupDestinationsByScope(this.destinations() ?? [], (propertyId) => this.propertyName(propertyId)),
  );

  readonly dialogVisible = signal(false);
  readonly editing = signal<PaymentDestinationResponse | null>(null);
  readonly qrVisible = signal(false);
  readonly qrDestination = signal<PaymentDestinationResponse | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly menuForId = signal<string | null>(null);
  readonly menuItems = signal<MenuItem[]>([]);
  readonly flashId = signal<string | null>(null);

  private readonly rowMenu = viewChild.required<Menu>('rowMenu');

  constructor() {
    this.load();
    this.propertiesApi
      .listAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (properties) => this.properties.set(properties) });
  }

  load(): void {
    this.destinations.set(null);
    this.error.set(null);
    this.destinationsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (destinations) => this.destinations.set(destinations),
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load payment destinations.')),
      });
  }

  canMutateAt(propertyId: string | null): boolean {
    return propertyId === null ? this.canMutateFallback() : this.canMutate();
  }

  propertyName(propertyId: string | null): string {
    if (!propertyId) return ORGANIZATION_FALLBACK_LABEL;
    return this.properties().find((property) => property.id === propertyId)?.name ?? 'Property';
  }

  kindLabel(destination: PaymentDestinationResponse): string {
    return destinationKindLabel(destination);
  }

  accountLine(destination: PaymentDestinationResponse): string {
    return destinationAccountLine(destination);
  }

  holder(destination: PaymentDestinationResponse): string {
    return destinationHolder(destination);
  }

  maskedNumber(destination: PaymentDestinationResponse): string {
    return destinationMaskedNumber(destination);
  }

  qrUrl(id: string): string {
    return this.destinationsApi.qrUrl(id);
  }

  openCreate(): void {
    if (!this.canMutate()) return;
    this.editing.set(null);
    this.dialogVisible.set(true);
  }

  openEdit(destination: PaymentDestinationResponse): void {
    if (!this.canMutateAt(destination.propertyId)) return;
    this.editing.set(destination);
    this.dialogVisible.set(true);
  }

  openQr(destination: PaymentDestinationResponse): void {
    this.qrDestination.set(destination);
    this.qrVisible.set(true);
  }

  onSaved(saved: PaymentDestinationResponse): void {
    const isNew = !(this.destinations() ?? []).some((item) => item.id === saved.id);
    this.replace(saved);
    this.flashId.set(saved.id);
    this.toast.add({ severity: 'success', summary: isNew ? 'Destination added' : 'Destination saved' });
  }

  openMenu(event: Event, destination: PaymentDestinationResponse, siblings: PaymentDestinationResponse[]): void {
    const index = siblings.findIndex((item) => item.id === destination.id);
    const editable = this.canMutateAt(destination.propertyId);
    const items: MenuItem[] = [{ label: 'View QR', command: () => this.openQr(destination) }];
    if (editable) {
      items.push(
        { label: 'Edit', command: () => this.openEdit(destination) },
        {
          label: destination.isEnabled ? 'Disable' : 'Enable',
          styleClass: destination.isEnabled ? 'row-overflow-danger' : undefined,
          command: () => this.toggleEnabled(destination),
        },
        { label: 'Move up', disabled: index <= 0, command: () => this.move(destination, siblings, -1) },
        {
          label: 'Move down',
          disabled: index === -1 || index >= siblings.length - 1,
          command: () => this.move(destination, siblings, 1),
        },
      );
    }
    this.menuItems.set(items);
    this.menuForId.set(destination.id);
    showPopupMenu(this.rowMenu(), event, items);
  }

  toggleEnabled(destination: PaymentDestinationResponse): void {
    if (!this.canMutateAt(destination.propertyId)) return;
    const isEnabled = !destination.isEnabled;
    this.busyId.set(destination.id);
    this.destinationsApi
      .update(destination.id, { isEnabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replace(updated);
          this.toast.add({
            severity: 'success',
            summary: isEnabled ? 'Destination enabled' : 'Destination disabled',
            detail: isEnabled ? undefined : 'Residents no longer see it, and staff cannot record new payments to it.',
          });
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({ severity: 'error', summary: 'Could not update', detail: apiErrorMessage(error) });
        },
      });
  }

  move(destination: PaymentDestinationResponse, siblings: PaymentDestinationResponse[], direction: -1 | 1): void {
    const items = reorderedSiblings(siblings, destination.id, direction);
    if (!items || !this.canMutateAt(destination.propertyId)) return;
    this.busyId.set(destination.id);
    this.destinationsApi
      .reorder(items)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.destinations.set(updated);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({ severity: 'error', summary: 'Could not reorder', detail: apiErrorMessage(error) });
        },
      });
  }

  private replace(updated: PaymentDestinationResponse): void {
    const list = this.destinations() ?? [];
    this.destinations.set(
      list.some((item) => item.id === updated.id)
        ? list.map((item) => (item.id === updated.id ? updated : item))
        : [...list, updated],
    );
  }
}
