import { DatePipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import {
  PRIVACY_CONSENT_SOURCE_LABELS,
  type PrivacyConsentItem,
  type ResidentPrivacyConsents,
} from '../../../../core/models/privacy.types';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge, type BadgeTone } from '../../../../shared/ui/status-badge/status-badge';
import { ResidentsService } from '../../services/residents.service';

export interface ConsentSummary {
  tone: BadgeTone;
  label: string;
  detail: string;
}

/** One line on where the tenant stands with the current notice. */
export function consentSummary(record: ResidentPrivacyConsents, formatDate: (iso: string) => string): ConsentSummary {
  const version = record.currentNotice.version;
  const { staffAttestedAt, tenantAppAt } = record.current;
  if (record.current.accepted) {
    const ways = [
      tenantAppAt ? `in Residence Care on ${formatDate(tenantAppAt)}` : null,
      staffAttestedAt ? `on a signed form attested ${formatDate(staffAttestedAt)}` : null,
    ].filter(Boolean);
    return { tone: 'success', label: `Accepted version ${version}`, detail: `Agreed ${ways.join(', and ')}.` };
  }
  const latest = record.consents[0];
  return {
    tone: 'warning',
    label: `Version ${version} not accepted`,
    detail: latest
      ? `Last accepted version ${latest.noticeVersion.version}. Residence Care asks again the next time the tenant opens it.`
      : 'No consent on record yet. Record it in the onboarding Consent step, or the tenant agrees in Residence Care.',
  };
}

@Component({
  selector: 'app-resident-consent-panel',
  imports: [DatePipe, PIcon, ErrorBanner, Skeleton, StatusBadge],
  template: `
    <section class="flex flex-col gap-2" aria-labelledby="consent-heading">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="consent-heading" class="m-0 font-heading text-base font-semibold text-heading">Privacy consent</h2>
        @if (record(); as current) {
          <a
            [href]="current.currentNotice.publicUrl"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 rounded-[2px] text-[12.5px] font-medium text-primary hover:underline"
          >
            Privacy notice v{{ current.currentNotice.version }}
            <svg pIcon="external-link" [size]="11" aria-hidden="true"></svg>
            <span class="sr-only">(opens in a new tab)</span>
          </a>
        }
      </div>

      @if (error(); as message) {
        <app-error-banner [message]="message" [retryable]="true" (retry)="load(residentId())" />
      } @else if (record(); as current) {
        @if (summary(); as line) {
          <div class="flex flex-col gap-1.5 rounded-base border border-border bg-background px-4 py-3">
            <app-status-badge class="self-start" [tone]="line.tone" [label]="line.label" />
            <p class="m-0 text-[12.5px] leading-relaxed text-muted">{{ line.detail }}</p>
          </div>
        }

        @if (current.consents.length > 0) {
          <div class="relative overflow-x-auto rounded-base border border-border">
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="border-b border-border bg-surface">
                  <th scope="col" class="px-4 py-2.5 text-[12.5px] font-medium text-muted">Version</th>
                  <th scope="col" class="px-4 py-2.5 text-[12.5px] font-medium text-muted">How</th>
                  <th scope="col" class="px-4 py-2.5 text-[12.5px] font-medium text-muted">Recorded by</th>
                  <th scope="col" class="px-4 py-2.5 text-[12.5px] font-medium text-muted">When</th>
                </tr>
              </thead>
              <tbody>
                @for (consent of current.consents; track consent.id) {
                  <tr class="border-b border-border last:border-b-0">
                    <td class="whitespace-nowrap px-4 py-2.5 text-[13px] text-body">
                      v{{ consent.noticeVersion.version }}
                      @if (consent.noticeVersion.id === current.currentNotice.id) {
                        <span class="text-[12px] text-muted">(current)</span>
                      }
                    </td>
                    <td class="px-4 py-2.5 text-[13px] text-body">{{ sourceLabels[consent.source] }}</td>
                    <td class="px-4 py-2.5 text-[13px] text-body">{{ recorder(consent) }}</td>
                    <td class="whitespace-nowrap px-4 py-2.5 text-[13px] text-muted">
                      {{ consent.recordedAt | date: 'MMM d, y, h:mm a' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else {
        <app-skeleton variant="row" />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentConsentPanel {
  private readonly residents = inject(ResidentsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  readonly residentId = input.required<string>();

  readonly sourceLabels = PRIVACY_CONSENT_SOURCE_LABELS;
  readonly record = signal<ResidentPrivacyConsents | null>(null);
  readonly error = signal<string | null>(null);
  readonly summary = computed(() => {
    const record = this.record();
    return record ? consentSummary(record, (iso) => formatDate(iso, 'MMM d, y', this.locale)) : null;
  });

  constructor() {
    effect(() => {
      const residentId = this.residentId();
      untracked(() => this.load(residentId));
    });
  }

  recorder(consent: PrivacyConsentItem): string {
    const by = consent.recordedBy;
    const name = by?.name || by?.email || 'Unknown';
    return consent.source === 'TENANT_APP' ? `${name} (tenant)` : name;
  }

  load(residentId: string): void {
    this.error.set(null);
    this.record.set(null);
    this.residents
      .privacyConsents(residentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => this.record.set(record),
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load privacy consent.')),
      });
  }
}
