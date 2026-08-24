import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import type {
  PaymentBand,
  RetentionBand,
  TenantRiskProfile,
} from '../../../../core/models/risk.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { BadgeTone, StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { TenantsService } from '../../services/tenants.service';

const PAYMENT_LABEL: Record<PaymentBand, string> = {
  STABLE: 'Stable',
  PAYMENT_DRIFT: 'Payment drift',
  HIGH_DEFAULT_RISK: 'High default risk',
  INSUFFICIENT_DATA: 'Not enough history',
};

const PAYMENT_TONE: Record<PaymentBand, BadgeTone> = {
  STABLE: 'success',
  PAYMENT_DRIFT: 'warning',
  HIGH_DEFAULT_RISK: 'destructive',
  INSUFFICIENT_DATA: 'neutral',
};

const RETENTION_LABEL: Record<RetentionBand, string> = {
  LIKELY_RENEW: 'Likely to renew',
  UNCERTAIN: 'Renewal uncertain',
  LIKELY_LEAVE: 'Likely to leave',
};

const RETENTION_TONE: Record<RetentionBand, BadgeTone> = {
  LIKELY_RENEW: 'success',
  UNCERTAIN: 'vacant',
  LIKELY_LEAVE: 'warning',
};

/**
 * Two separate readings of a tenant, and the arithmetic behind both.
 *
 * They are separate because they call for opposite actions. A tenant heading
 * for default should be chased; a good tenant heading for the door should be
 * kept. One combined "risk score" gets the second group treated like the
 * first, which is how a landlord loses the tenants they most wanted.
 *
 * The numbers are shown, not hidden behind the badge. "Last four rents were 2,
 * 7, 14 and 21 days late" can be checked against the bills listed further down
 * this same page — so a band that is wrong is visibly wrong, rather than
 * mysteriously wrong. A score nobody can check is one that gets either ignored
 * or obeyed blindly, and both are worse than no score.
 *
 * Nothing here is decided by a model, and nothing here acts on its own: no
 * automatic reminders, no automatic notices. It is advice for a person who
 * makes the call.
 */
@Component({
  selector: 'app-tenant-risk-panel',
  imports: [PIcon, PhpCurrencyPipe, StatusBadge],
  templateUrl: './tenant-risk-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantRiskPanel {
  private readonly tenants = inject(TenantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tenantId = input.required<string>();

  readonly profile = signal<TenantRiskProfile | null>(null);
  readonly loading = signal(true);
  /**
   * Failure is silent by design.
   *
   * This is a read-only second opinion beside a profile that is already fully
   * usable. An error banner here would put a scary red box on a page where
   * nothing is actually wrong.
   */
  readonly failed = signal(false);
  readonly showWorking = signal(false);

  readonly paymentLabel = computed(() => {
    const band = this.profile()?.payment.band;
    return band ? PAYMENT_LABEL[band] : '';
  });
  readonly paymentTone = computed<BadgeTone>(() => {
    const band = this.profile()?.payment.band;
    return band ? PAYMENT_TONE[band] : 'neutral';
  });

  readonly retentionLabel = computed(() => {
    const band = this.profile()?.retention?.band;
    return band ? RETENTION_LABEL[band] : '';
  });
  readonly retentionTone = computed<BadgeTone>(() => {
    const band = this.profile()?.retention?.band;
    return band ? RETENTION_TONE[band] : 'neutral';
  });

  /**
   * The lateness series, newest last, as the popover renders it.
   *
   * Capped at six: the point is to make a trend legible at a glance, and a
   * twelve-item strip of numbers is read as noise rather than as a pattern.
   */
  readonly latenessTrail = computed(() => {
    const series = this.profile()?.signals.payment.latenessDays ?? [];
    return series.slice(-6);
  });

  readonly hasWorking = computed(() => (this.profile()?.signals.payment.sampleSize ?? 0) > 0);

  /**
   * The derived figures are computed here rather than in the template.
   *
   * Each is null-or-a-string, so the template can bind it with `@if (x; as y)`
   * — Angular's control flow narrows a bound alias, but does not narrow a
   * `!== null` check on a nested property, which is how a "0 days / month" row
   * ends up rendered from a null.
   */
  readonly driftLabel = computed(() => {
    const drift = this.profile()?.signals.payment.driftDaysPerPeriod;
    if (drift === null || drift === undefined) return null;
    return `${drift > 0 ? '+' : ''}${drift} days / month`;
  });

  readonly averageLabel = computed(() => {
    const average = this.profile()?.signals.payment.averageLatenessDays;
    if (average === null || average === undefined) return null;
    return this.latenessLabel(average);
  });

  readonly consumptionLabel = computed(() => {
    const drop = this.profile()?.signals.consumption.dropRatio;
    if (drop === null || drop === undefined) return null;
    return drop > 0 ? `${Math.round(drop * 100)}% below usual` : 'normal';
  });

  /** "+7 days late" / "3 days early" — a bare number reads ambiguously here. */
  latenessLabel(days: number): string {
    if (days === 0) return 'on time';
    return days > 0 ? `${days}d late` : `${Math.abs(days)}d early`;
  }

  latenessTone(days: number): string {
    if (days <= 0) return 'text-success';
    if (days <= 7) return 'text-body';
    return 'text-destructive';
  }

  constructor() {
    effect(() => {
      const id = this.tenantId();
      if (id) this.load(id);
    });
  }

  toggleWorking(): void {
    this.showWorking.update((open) => !open);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.failed.set(false);
    this.tenants
      .risk(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: () => {
          this.profile.set(null);
          this.loading.set(false);
          this.failed.set(true);
        },
      });
  }
}
