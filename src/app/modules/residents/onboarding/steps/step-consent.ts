import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';
import { ProgressSpinner } from 'primeng/progressspinner';

import type { ConsentStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';

/** The words staff confirm, as on the printed form. */
export const CONSENT_ATTESTATION = 'The tenant read the privacy notice and signed the printed consent form.';

/**
 * Consent comes before requirements: staff go over the privacy notice with
 * the tenant, who signs the printed form, and confirm it here. Saving records
 * the tenant's consent to the current notice version under the staff
 * member's name. The box starts empty every time it is needed.
 */
@Component({
  selector: 'app-step-consent',
  imports: [DatePipe, PIcon, ProgressSpinner],
  templateUrl: './step-consent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepConsent {
  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly next = output<ConsentStepData>();
  readonly back = output<void>();

  readonly attestation = CONSENT_ATTESTATION;

  readonly notice = computed(() => this.detail().privacy.notice);
  readonly recorded = computed(() => this.detail().privacy.consent);
  /** Consent on record for the version tenants read today. Nothing to confirm again. */
  readonly recordedOnCurrent = computed(() => this.recorded()?.noticeVersion === this.notice().version);

  /** Unticked until staff tick it, and again whenever the tenant or the notice changes. */
  readonly attested = linkedSignal<boolean>(() => {
    this.detail();
    return false;
  });

  readonly canContinue = computed(() => this.recordedOnCurrent() || this.attested());

  recorderName(): string {
    const by = this.recorded()?.recordedBy;
    return by?.name || by?.email || 'a staff member';
  }

  toggle(event: Event): void {
    this.attested.set((event.target as HTMLInputElement).checked);
  }

  submit(): void {
    if (!this.canContinue()) return;
    this.next.emit({ attested: true, noticeVersionId: this.notice().id });
  }
}
