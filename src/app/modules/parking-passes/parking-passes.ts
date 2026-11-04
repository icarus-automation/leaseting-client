import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService, type MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';

import { AuthService } from '../../core/auth/auth.service';
import { apiErrorMessage } from '../../core/models/api.types';
import type { ParkingPass } from '../../core/models/parking-pass.types';
import type { PropertyListItem } from '../../core/models/property.types';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../shared/ui/error-banner/error-banner';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { showPopupMenu } from '../../shared/utils/popup-menu.util';
import { PropertiesService } from '../properties/services/properties.service';
import { ChangePlateDialog } from './components/change-plate-dialog/change-plate-dialog';
import { EndPassDialog } from './components/end-pass-dialog/end-pass-dialog';
import { RefundPassDialog } from './components/refund-pass-dialog/refund-pass-dialog';
import { RenewPassDialog } from './components/renew-pass-dialog/renew-pass-dialog';
import { SellPassDialog } from './components/sell-pass-dialog/sell-pass-dialog';
import { ParkingPassesService } from './services/parking-passes.service';
import { formatPassDay, passStatus, paymentRemainingCents } from './utils/parking-pass.util';

@Component({
  selector: 'app-parking-passes',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PIcon,
    Menu,
    Select,
    PhpCurrencyPipe,
    EmptyState,
    ErrorBanner,
    Skeleton,
    StatusBadge,
    SellPassDialog,
    RenewPassDialog,
    ChangePlateDialog,
    EndPassDialog,
    RefundPassDialog,
  ],
  templateUrl: './parking-passes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingPasses {
  private readonly passes = inject(ParkingPassesService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly overflowMenu = viewChild.required<Menu>('overflowMenu');
  private loadSeq = 0;

  readonly canSell = computed(() => this.auth.can('parking_passes:sell'));
  readonly canAdminister = computed(() => this.auth.can('parking_passes:administer'));
  readonly canViewLeases = computed(() => this.auth.can('leases:view'));

  readonly items = signal<ParkingPass[] | null>(null);
  readonly properties = signal<PropertyListItem[]>([]);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.items() === null && this.error() === null);

  readonly propertyControl = new FormControl('', { nonNullable: true });
  readonly plateControl = new FormControl('', { nonNullable: true });
  readonly propertyOptions = computed(() => [
    { label: 'All properties', value: '' },
    ...this.properties().map((property) => ({ label: property.name, value: property.id })),
  ]);

  readonly sellVisible = signal(false);
  readonly renewVisible = signal(false);
  readonly plateVisible = signal(false);
  readonly endVisible = signal(false);
  readonly refundVisible = signal(false);
  readonly actionPass = signal<ParkingPass | null>(null);
  readonly overflowForId = signal<string | null>(null);
  readonly overflowItems = signal<MenuItem[]>([]);

  constructor() {
    this.propertiesApi
      .listAll()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rows) => this.properties.set(rows),
        error: () => undefined,
      });
    this.propertyControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.load());
    this.plateControl.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    const seq = ++this.loadSeq;
    this.error.set(null);
    if (this.items() === null) this.items.set(null);
    this.passes
      .list({
        propertyId: this.propertyControl.value || undefined,
        plate: this.plateControl.value.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          if (seq !== this.loadSeq) return;
          this.items.set(rows);
        },
        error: (error: unknown) => {
          if (seq !== this.loadSeq) return;
          this.items.update((current) => current ?? []);
          this.error.set(apiErrorMessage(error, 'Could not load parking passes.'));
        },
      });
  }

  day(iso: string): string {
    return formatPassDay(iso);
  }

  status(pass: ParkingPass) {
    return passStatus(pass);
  }

  latestAmount(pass: ParkingPass): string | null {
    const payment = pass.payments.at(-1);
    return payment?.amount ?? null;
  }

  openOverflow(event: Event, pass: ParkingPass): void {
    const items: MenuItem[] = [];
    if (this.canSell() && !pass.endedAt) {
      items.push({ label: 'Renew', command: () => this.openRenew(pass) });
    }
    if (this.canAdminister() && !pass.endedAt) {
      items.push({ label: 'Change plate', command: () => this.openPlate(pass) });
      items.push({ label: 'End pass', styleClass: 'row-overflow-danger', command: () => this.openEnd(pass) });
    }
    if (this.canAdminister() && pass.payments.some((payment) => paymentRemainingCents(payment) > 0)) {
      items.push({ label: 'Refund', command: () => this.openRefund(pass) });
    }
    this.overflowItems.set(items);
    this.overflowForId.set(pass.id);
    showPopupMenu(this.overflowMenu(), event, items);
  }

  hasActions(pass: ParkingPass): boolean {
    if (!pass.endedAt && (this.canSell() || this.canAdminister())) return true;
    return this.canAdminister() && pass.payments.some((payment) => paymentRemainingCents(payment) > 0);
  }

  openRenew(pass: ParkingPass): void {
    this.actionPass.set(pass);
    this.renewVisible.set(true);
  }

  openPlate(pass: ParkingPass): void {
    this.actionPass.set(pass);
    this.plateVisible.set(true);
  }

  openEnd(pass: ParkingPass): void {
    this.actionPass.set(pass);
    this.endVisible.set(true);
  }

  openRefund(pass: ParkingPass): void {
    this.actionPass.set(pass);
    this.refundVisible.set(true);
  }

  onSold(): void {
    this.toast.add({ severity: 'success', summary: 'Pass sold' });
    this.load();
  }

  onRenewed(): void {
    this.toast.add({ severity: 'success', summary: 'Pass renewed' });
    this.load();
  }

  onPlateChanged(): void {
    this.toast.add({ severity: 'success', summary: 'Plate updated' });
    this.load();
  }

  onEnded(): void {
    this.toast.add({ severity: 'success', summary: 'Pass ended' });
    this.load();
  }

  onRefunded(): void {
    this.toast.add({ severity: 'success', summary: 'Refund recorded' });
    this.load();
  }
}
