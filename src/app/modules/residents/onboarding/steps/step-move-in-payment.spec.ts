import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import type { MoveInPaymentStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';
import { PaymentDestinationsService } from '../../../settings/services/payment-destinations.service';
import { ResidentsService } from '../../services/residents.service';
import { StepMoveInPayment } from './step-move-in-payment';

const AT = '2026-09-26T00:00:00.000Z';

const ONE_TIME_CHARGES = [
  { chargeItemId: 'key', name: 'Key Deposit', billType: 'OTHER' as const, amount: 1000 },
  { chargeItemId: 'card', name: 'Gate card', billType: 'OTHER' as const, amount: 300 },
];

function onboarding(moveIn?: Partial<MoveInPaymentStepData>, oneTimeCharges = ONE_TIME_CHARGES): OnboardingDetail {
  return {
    id: 'ob-1',
    status: 'IN_PROGRESS',
    currentStepKey: 'move-in-payment',
    completedSteps: ['overview', 'resident', 'requirements', 'lease-terms', 'deposit', 'contract'],
    totalSteps: 9,
    privacy: {
      notice: { id: 'notice-2', version: 2, publishedAt: '2026-11-03T03:00:00.000Z', publicUrl: 'http://localhost:4200/privacy/org' },
      consent: null,
    },
    resident: { id: 'resident-1', firstName: 'Ada', lastName: 'Lovelace' },
    unit: { id: 'unit-1', unitNo: '103', property: { id: 'prop-1', name: 'Brickstone' } },
    leaseId: null,
    createdAt: AT,
    updatedAt: AT,
    stepsState: {
      'lease-terms': { completedAt: AT, data: { dueDay: 5, charges: [{ name: 'Monthly Rent', billType: 'RENT', amount: 5000 }] } },
      deposit: {
        completedAt: AT,
        data: {
          collectsAdvance: true,
          advanceMonths: 1,
          holdsDeposit: true,
          depositMonths: 2,
          oneTimeCharges,
        },
      },
      ...(moveIn ? { 'move-in-payment': { completedAt: AT, data: { ...moveIn } } } : {}),
    },
  };
}

describe('StepMoveInPayment one-time charges', () => {
  let fixture: ComponentFixture<StepMoveInPayment>;
  let component: StepMoveInPayment;
  let emitted: MoveInPaymentStepData[];

  async function render(moveIn?: Partial<MoveInPaymentStepData>, oneTimeCharges = ONE_TIME_CHARGES): Promise<void> {
    fixture = TestBed.createComponent(StepMoveInPayment);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('detail', onboarding(moveIn, oneTimeCharges));
    emitted = [];
    component.next.subscribe((data) => emitted.push(data));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepMoveInPayment],
      providers: [
        { provide: ResidentsService, useValue: {} },
        { provide: PaymentDestinationsService, useValue: { list: () => of([]) } },
      ],
    }).compileComponents();
  });

  afterEach(() => fixture.destroy());

  it('asks what was received for each one-time charge, starting at the full charge', async () => {
    await render();

    expect(component.terms()?.oneTimeDue).toBe(1300);
    expect(component.form.controls.oneTimeAmounts.getRawValue()).toEqual([1000, 300]);
    const labels = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('label[for^="ob-one-time-"]'));
    expect(labels.map((label) => label.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      expect.stringContaining('Key Deposit received'),
      expect.stringContaining('Gate card received'),
    ]);
  });

  it('keeps what was saved and sends the amounts in the charges order', async () => {
    await render({ advanceAmount: 5000, depositAmount: 10000, paidOn: '2026-09-26', method: 'CASH', oneTimeAmounts: [400] });

    expect(component.form.controls.oneTimeAmounts.getRawValue()).toEqual([400, 300]);
    component.submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].oneTimeAmounts).toEqual([400, 300]);
  });

  it('leaves the amounts out without one-time charges, so an older API still takes the step', async () => {
    await render(undefined, []);

    expect(fixture.nativeElement.querySelector('label[for^="ob-one-time-"]')).toBeNull();
    component.submit();

    expect(emitted).toHaveLength(1);
    expect('oneTimeAmounts' in emitted[0]).toBe(false);
  });

  it('refuses receiving more than a one-time charge bills', async () => {
    await render();

    component.form.controls.oneTimeAmounts.at(1).setValue(300.01);
    component.submit();

    expect(emitted).toEqual([]);
    expect(component.errorMessage()).toBe('That is more than what has been billed. Lower the payment, or adjust the charges.');
  });
});
