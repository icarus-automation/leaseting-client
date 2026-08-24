import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService, MessageService } from 'primeng/api';

import { apiErrorMessage } from '../../../core/models/api.types';
import {
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEP_ORDER,
  type LeaseTermsStepData,
  type OnboardingDetail,
  type OnboardingStepData,
  type OnboardingStepKey,
  type OverviewStepData,
  type TurnoverStepData,
} from '../../../core/models/onboarding.types';
import { PhpCurrencyPipe } from '../../../shared/pipes/php-currency-pipe';
import { ErrorBanner } from '../../../shared/ui/error-banner/error-banner';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { Stepper, type StepperStep } from '../../../shared/ui/stepper/stepper';
import { leaseTermLabel } from '../../../shared/utils/date.util';
import { OnboardingsService } from '../services/onboardings.service';
import { StepContract } from './steps/step-contract';
import { StepDeposit } from './steps/step-deposit';
import { StepLeaseTerms } from './steps/step-lease-terms';
import { StepMoveInPayment } from './steps/step-move-in-payment';
import { StepOverview } from './steps/step-overview';
import { StepRequirements } from './steps/step-requirements';
import { StepTenant } from './steps/step-tenant';
import { StepTurnover } from './steps/step-turnover';

/**
 * Full-page resumable move-in wizard. Every "Next" persists its step to the
 * backend before advancing, so closing the tab loses nothing: reopening the
 * onboarding lands on the first unfinished step. The lease and its opening
 * bills only exist after the final completion call.
 */
@Component({
  selector: 'app-onboarding-wizard',
  imports: [
    RouterLink,
    PIcon,
    PhpCurrencyPipe,
    ErrorBanner,
    Skeleton,
    Stepper,
    StepOverview,
    StepTenant,
    StepRequirements,
    StepLeaseTerms,
    StepDeposit,
    StepContract,
    StepMoveInPayment,
    StepTurnover,
  ],
  templateUrl: './onboarding-wizard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWizard {
  private readonly onboardings = inject(OnboardingsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly id = computed(() => this.params().get('id') ?? '');

  readonly detail = signal<OnboardingDetail | null>(null);
  readonly activeStep = signal<OnboardingStepKey>('overview');
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly stepError = signal<string | null>(null);

  readonly stepLabels = ONBOARDING_STEP_LABELS;

  readonly stepperSteps = computed<StepperStep[]>(() => {
    const detail = this.detail();
    const active = this.activeStep();
    const done = new Set(detail?.completedSteps ?? []);
    return ONBOARDING_STEP_ORDER.map((key) => ({
      key,
      label: ONBOARDING_STEP_LABELS[key],
      status: key === active ? 'current' : done.has(key) ? 'done' : 'upcoming',
      // Visited = already saved once, or the backend's resume point.
      clickable: key !== active && (done.has(key) || key === detail?.currentStepKey),
    }));
  });

  readonly stepIndex = computed(() => ONBOARDING_STEP_ORDER.indexOf(this.activeStep()) + 1);
  readonly tenantName = computed(() => {
    const tenant = this.detail()?.tenant;
    return tenant ? `${tenant.firstName} ${tenant.lastName}` : null;
  });

  /** Context rail: the term agreed in the Overview step, once it exists. */
  readonly leaseTerm = computed(() => {
    const saved = this.detail()?.stepsState.overview?.data as OverviewStepData | undefined;
    if (!saved?.startDate || !saved.endDate) return null;
    const format = (iso: string) =>
      new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    return {
      range: `${format(saved.startDate)} – ${format(saved.endDate)}`,
      length: leaseTermLabel(saved.startDate, saved.endDate),
    };
  });

  /** Context rail: the sum of the rent charges, once the terms step is saved. */
  readonly monthlyRent = computed(() => {
    const saved = this.detail()?.stepsState['lease-terms']?.data as LeaseTermsStepData | undefined;
    if (!saved?.charges?.length) return null;
    return saved.charges.reduce((total, charge) => total + charge.amount, 0);
  });

  constructor() {
    // Route param arrives after construction (and can change in place when
    // navigating between onboardings) — reload whenever it does.
    effect(() => {
      const id = this.id();
      if (!id) return;
      untracked(() => this.load(id));
    });
  }

  jumpTo(stepKey: string): void {
    this.stepError.set(null);
    this.activeStep.set(stepKey as OnboardingStepKey);
  }

  goBack(): void {
    const index = ONBOARDING_STEP_ORDER.indexOf(this.activeStep());
    if (index > 0) this.jumpTo(ONBOARDING_STEP_ORDER[index - 1]);
  }

  /** Persist a step, then move forward one. */
  saveStep(stepKey: OnboardingStepKey, data: OnboardingStepData): void {
    this.persistStep(stepKey, data, () => {
      const index = ONBOARDING_STEP_ORDER.indexOf(stepKey);
      if (index < ONBOARDING_STEP_ORDER.length - 1) this.activeStep.set(ONBOARDING_STEP_ORDER[index + 1]);
    });
  }

  /** Final step: persist turnover, then run the completion transaction. */
  completeFlow(data: TurnoverStepData): void {
    this.persistStep('turnover', data, () => {
      this.saving.set(true);
      this.onboardings
        .complete(this.id())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (detail) => {
            this.saving.set(false);
            this.detail.set(detail);
            this.toast.add({
              severity: 'success',
              summary: 'Onboarding complete',
              detail: 'Lease created — opening bills and payments are posted.',
            });
          },
          error: (error: unknown) => {
            this.saving.set(false);
            this.stepError.set(apiErrorMessage(error, 'Could not complete the onboarding.'));
          },
        });
    });
  }

  confirmCancel(): void {
    this.confirmation.confirm({
      header: 'Cancel onboarding?',
      message: 'Progress is discarded, but the tenant and any uploaded documents are kept.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Cancel onboarding', severity: 'danger' },
      rejectButtonProps: { label: 'Keep going', severity: 'secondary', outlined: true },
      accept: () => {
        this.onboardings
          .cancel(this.id())
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.toast.add({ severity: 'info', summary: 'Onboarding cancelled' });
              void this.router.navigate(['/tenants']);
            },
            error: (error: unknown) => {
              this.toast.add({
                severity: 'error',
                summary: 'Cannot cancel',
                detail: apiErrorMessage(error, 'Try again.'),
              });
            },
          });
      },
    });
  }

  private persistStep(stepKey: OnboardingStepKey, data: OnboardingStepData, onSaved: () => void): void {
    this.stepError.set(null);
    this.saving.set(true);
    this.onboardings
      .updateStep(this.id(), stepKey, data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.saving.set(false);
          this.detail.set(detail);
          onSaved();
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.stepError.set(apiErrorMessage(error, 'Could not save this step.'));
        },
      });
  }

  private load(id: string): void {
    this.loading.set(true);
    this.onboardings
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.loading.set(false);
          this.detail.set(detail);
          this.activeStep.set(detail.currentStepKey);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.loadError.set(apiErrorMessage(error, 'Could not load this onboarding.'));
        },
      });
  }
}
