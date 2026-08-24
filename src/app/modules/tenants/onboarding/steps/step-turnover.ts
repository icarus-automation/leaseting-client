import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';

import type {
  DepositStepData,
  LeaseTermsStepData,
  MoveInPaymentStepData,
  OnboardingDetail,
  OverviewStepData,
  TurnoverStepData,
} from '../../../../core/models/onboarding.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';
import { ordinal } from '../../../../shared/utils/date.util';

type TurnoverKey = keyof TurnoverStepData;

const CHECKLIST: { key: TurnoverKey; label: string; hint: string }[] = [
  { key: 'keysHanded', label: 'Keys handed over', hint: 'Unit, mailbox, and building access.' },
  { key: 'unitInspected', label: 'Unit inspected together', hint: 'Walkthrough done, condition agreed with the tenant.' },
  { key: 'utilitiesRead', label: 'Utility meters read', hint: 'Opening electric/water readings noted for the first bill.' },
];

/**
 * Step 8 — physical turnover checklist plus a recap of everything completion
 * is about to write: the lease, its opening bills, and the move-in payments.
 */
@Component({
  selector: 'app-step-turnover',
  imports: [DatePipe, PIcon, PhpCurrencyPipe],
  templateUrl: './step-turnover.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepTurnover {
  readonly detail = input.required<OnboardingDetail>();
  readonly busy = input(false);
  readonly complete = output<TurnoverStepData>();
  readonly back = output<void>();

  readonly checklist = CHECKLIST;

  readonly checked = linkedSignal<TurnoverStepData>(() => {
    const saved = this.detail().stepsState.turnover?.data as Partial<TurnoverStepData> | undefined;
    return {
      keysHanded: saved?.keysHanded ?? false,
      unitInspected: saved?.unitInspected ?? false,
      utilitiesRead: saved?.utilitiesRead ?? false,
    };
  });

  readonly allChecked = computed(() => {
    const state = this.checked();
    return state.keysHanded && state.unitInspected && state.utilitiesRead;
  });

  /** Everything completion is about to write, read back from the saved steps. */
  readonly summary = computed(() => {
    const stepsState = this.detail().stepsState;
    const overview = stepsState.overview?.data as OverviewStepData | undefined;
    const terms = stepsState['lease-terms']?.data as LeaseTermsStepData | undefined;
    const deposit = stepsState.deposit?.data as DepositStepData | undefined;
    const moveIn = stepsState['move-in-payment']?.data as MoveInPaymentStepData | undefined;
    if (!overview || !terms || !deposit) return null;

    const monthlyRent = (terms.charges ?? []).reduce((total, charge) => total + charge.amount, 0);
    const advanceMonths = deposit.collectsAdvance ? deposit.advanceMonths : 0;
    const depositMonths = deposit.holdsDeposit ? deposit.depositMonths : 0;
    return {
      startDate: overview.startDate,
      endDate: overview.endDate,
      monthlyRent,
      charges: terms.charges ?? [],
      dueDayLabel: ordinal(terms.dueDay),
      advanceMonths,
      depositMonths,
      advanceDue: monthlyRent * advanceMonths,
      depositDue: monthlyRent * depositMonths,
      advancePaid: moveIn?.advanceAmount ?? 0,
      depositPaid: moveIn?.depositAmount ?? 0,
    };
  });

  toggle(key: TurnoverKey): void {
    this.checked.update((state) => ({ ...state, [key]: !state[key] }));
  }

  submit(): void {
    if (!this.allChecked()) return;
    this.complete.emit(this.checked());
  }
}
