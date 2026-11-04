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
import { ConfirmService } from '../../shared/ui/confirm/confirm.service';
import { formatPhp } from '../../shared/pipes/php-currency-pipe';
import { showPopupMenu } from '../../shared/utils/popup-menu.util';
import { PropertiesService } from '../properties/services/properties.service';
import { ChangePlateDialog } from './components/change-plate-dialog/change-plate-dialog';
import { EndPassDialog } from './components/end-pass-dialog/end-pass-dialog';
import { RefundPassDialog } from './components/refund-pass-dialog/refund-pass-dialog';
import { RenewPassDialog } from './components/renew-pass-dialog/renew-pass-dialog';
import { SellPassDialog } from './components/sell-pass-dialog/sell-pass-dialog';
import { ParkingPassesService } from './services/parking-passes.service';
import {
  canBillByHand,
  formatPassDay,
  isLinked,
  passStatus,
  paymentsWithRemainder,
  reviewReasonLabel,
  waitingBill,
} from './utils/parking-pass.util';

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
  private readonly confirm = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly overflowMenu = viewChild.required<Menu>('overflowMenu');
  private loadSeq = 0;

  readonly canSell = computed(() => this.auth.can('parking_passes:sell'));
  readonly canAdminister = computed(() => this.auth.can('parking_passes:administer'));
  readonly canViewLeases = computed(() => this.auth.can('leases:view'));
  readonly canViewBills = computed(() => this.auth.can('bills:view'));
  readonly busyPassId = signal<string | null>(null);

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

  linked(pass: ParkingPass): boolean {
    return isLinked(pass);
  }

  nextBill(pass: ParkingPass) {
    return waitingBill(pass);
  }

  flaggedBills(pass: ParkingPass) {
    return pass.openBills.filter((bill) => bill.needsReview);
  }

  reviewReason(reason: Parameters<typeof reviewReasonLabel>[0]): string {
    return reviewReasonLabel(reason);
  }

  openOverflow(event: Event, pass: ParkingPass): void {
    const items: MenuItem[] = [];
    if (this.canSell() && !pass.endedAt) {
      items.push({ label: 'Renew', command: () => this.openRenew(pass) });
    }
    if (this.canAdminister() && !pass.endedAt && isLinked(pass)) {
      items.push({
        label: pass.autoRenew ? 'Turn off auto-renew' : 'Turn on auto-renew',
        command: () => this.toggleAutoRenew(pass),
      });
    }
    if (this.canAdminister() && canBillByHand(pass)) {
      items.push({ label: 'Bill next month', command: () => this.billNextMonth(pass) });
    }
    if (this.canAdminister() && !pass.endedAt) {
      items.push({ label: 'Change plate', command: () => this.openPlate(pass) });
      items.push({ label: 'End pass', styleClass: 'row-overflow-danger', command: () => this.openEnd(pass) });
    }
    if (this.canAdminister() && paymentsWithRemainder(pass).length > 0) {
      items.push({ label: 'Refund', command: () => this.openRefund(pass) });
    }
    this.overflowItems.set(items);
    this.overflowForId.set(pass.id);
    showPopupMenu(this.overflowMenu(), event, items);
  }

  hasActions(pass: ParkingPass): boolean {
    if (!pass.endedAt && (this.canSell() || this.canAdminister())) return true;
    return this.canAdminister() && paymentsWithRemainder(pass).length > 0;
  }

  /** Turning auto-renew off cancels the waiting bill, so it asks first when one is there. */
  toggleAutoRenew(pass: ParkingPass): void {
    if (!pass.autoRenew) {
      this.saveAutoRenew(pass, true);
      return;
    }
    const bill = waitingBill(pass);
    if (!bill) {
      this.saveAutoRenew(pass, false);
      return;
    }
    this.confirm.danger({
      header: 'Turn off auto-renew',
      message:
        `${pass.plateDisplay} stops billing itself each month, and its unpaid bill of ${formatPhp(bill.balance)} ` +
        `due ${formatPassDay(bill.dueDate)} is cancelled. A bill that already has a payment stays open for review.`,
      acceptLabel: 'Turn off',
      onAccept: () => this.saveAutoRenew(pass, false),
    });
  }

  billNextMonth(pass: ParkingPass): void {
    this.busyPassId.set(pass.id);
    this.passes
      .billNextMonth(pass.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyPassId.set(null);
          const bill = waitingBill(updated);
          this.toast.add({
            severity: 'success',
            summary: 'Next month billed',
            detail: bill ? `${formatPhp(bill.amount)} due ${formatPassDay(bill.dueDate)}` : undefined,
          });
          this.load();
        },
        error: (error: unknown) => this.failAction(error, 'Could not bill the next month.'),
      });
  }

  private saveAutoRenew(pass: ParkingPass, autoRenew: boolean): void {
    this.busyPassId.set(pass.id);
    this.passes
      .setAutoRenew(pass.id, autoRenew)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyPassId.set(null);
          this.toast.add({ severity: 'success', summary: autoRenew ? 'Auto-renew on' : 'Auto-renew off' });
          this.load();
        },
        error: (error: unknown) => this.failAction(error, 'Could not change auto-renew.'),
      });
  }

  private failAction(error: unknown, fallback: string): void {
    this.busyPassId.set(null);
    this.toast.add({ severity: 'error', summary: apiErrorMessage(error, fallback) });
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
