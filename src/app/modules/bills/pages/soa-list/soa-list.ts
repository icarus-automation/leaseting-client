import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PageMeta } from '../../../../core/models/api.types';
import type { SoaResponse } from '../../../../core/models/soa.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge, BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { GenerateSoaDialog } from '../../components/generate-soa-dialog/generate-soa-dialog';
import { SoaLines } from '../../components/soa-lines/soa-lines';
import { SoaService } from '../../services/soa.service';

@Component({
  selector: 'app-soa-list',
  imports: [
    DatePipe,
    RouterLink,
    PIcon,
    PhpCurrencyPipe,
    EmptyState,
    Pagination,
    Skeleton,
    StatusBadge,
    GenerateSoaDialog,
    SoaLines,
  ],
  templateUrl: './soa-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoaList {
  private readonly auth = inject(AuthService);
  private readonly soa = inject(SoaService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly items = signal<SoaResponse[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly resendingId = signal<string | null>(null);
  readonly expandedId = signal<string | null>(null);
  readonly dialogVisible = signal(false);
  readonly skeletons = Array.from({ length: 6 });

  readonly smsAvailable = this.auth.features;

  constructor() {
    this.load(1);
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.soa
      .list({ page, limit: 10 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.set(result.data);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load statements.'));
        },
      });
  }

  downloadUrl(statement: SoaResponse): string {
    return this.soa.downloadUrl(statement.id);
  }

  toggleDetails(statementId: string): void {
    this.expandedId.update((current) => (current === statementId ? null : statementId));
  }

  smsBadge(statement: SoaResponse): { label: string; tone: BadgeTone } {
    switch (statement.smsStatus) {
      case 'SENT':
        return { label: 'SMS sent', tone: 'success' };
      case 'FAILED':
        return { label: 'SMS failed', tone: 'destructive' };
      default:
        return { label: 'No SMS', tone: 'neutral' };
    }
  }

  resendSms(statement: SoaResponse): void {
    this.resendingId.set(statement.id);
    this.soa
      .resendSms(statement.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.resendingId.set(null);
          this.items.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
          this.toast.add(
            updated.smsStatus === 'SENT'
              ? { severity: 'success', summary: 'SMS summary sent' }
              : { severity: 'error', summary: 'SMS failed to send' },
          );
        },
        error: (error: unknown) => {
          this.resendingId.set(null);
          this.toast.add({ severity: 'error', summary: 'Could not send SMS', detail: apiErrorMessage(error) });
        },
      });
  }

  onGenerated(): void {
    this.load(1);
  }
}
