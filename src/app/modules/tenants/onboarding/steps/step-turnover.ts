import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';

import type {
  LeaseTermsStepData,
  MoveInPaymentStepData,
  OnboardingDetail,
  TurnoverStepData,
} from '../../../../core/models/onboarding.types';
import { PhpCurrencyPipe } from '../../../../shared/pipes/php-currency-pipe';

type TurnoverKey = keyof TurnoverStepData;

const CHECKLIST: { key: TurnoverKey; label: string; hint: string }[] = [
  { key: 'keysHanded', label: 'Keys handed over', hint: 'Unit, mailbox, and building access.' },
  { key: 'unitInspected', label: 'Unit inspected together', hint: 'Walkthrough done, condition agreed with the tenant.' },
  { key: 'utilitiesRead', label: 'Utility meters read', hint: 'Opening electric/water readings noted for the first bill.' },
];

/**
 * Step 6 — physical turnover checklist plus a recap of everything completion
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

  readonly summary = computed(() => {
    const detail = this.detail();
    const terms = detail.stepsState['lease-terms']?.data as LeaseTermsStepData | undefined;
    const moveIn = detail.stepsState['move-in-payment']?.data as MoveInPaymentStepData | undefined;
    if (!terms) return null;
    return {
      startDate: terms.startDate,
      endDate: terms.endDate,
      monthlyRent: terms.monthlyRent,
      dueDay: terms.dueDay,
      advanceDue: terms.monthlyRent * terms.advanceMonths,
      depositDue: terms.monthlyRent * terms.depositMonths,
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
