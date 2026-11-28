import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { DepositStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';
import { ChargeItemsService } from '../../../settings/services/charge-items.service';
import { StepDeposit } from './step-deposit';

const KEY_DEPOSIT = { chargeItemId: 'key', name: 'Key Deposit', billType: 'OTHER' as const, description: '2 keys', amount: 1000 };

function onboarding(deposit?: DepositStepData): OnboardingDetail {
  const at = '2026-09-26T00:00:00.000Z';
  return {
    id: 'ob-1',
    status: 'IN_PROGRESS',
    currentStepKey: 'deposit',
    completedSteps: ['overview', 'resident', 'requirements', 'lease-terms'],
    totalSteps: 9,
    privacy: {
      notice: { id: 'notice-2', version: 2, publishedAt: '2026-11-03T03:00:00.000Z', publicUrl: 'http://localhost:4200/privacy/org' },
      consent: null,
    },
    resident: { id: 'resident-1', firstName: 'Ada', lastName: 'Lovelace' },
    unit: { id: 'unit-1', unitNo: '103', property: { id: 'prop-1', name: 'Brickstone' } },
    leaseId: null,
    createdAt: at,
    updatedAt: at,
    stepsState: {
      'lease-terms': { completedAt: at, data: { dueDay: 5, charges: [{ name: 'Monthly Rent', billType: 'RENT', amount: 5000 }] } },
      ...(deposit ? { deposit: { completedAt: at, data: { ...deposit } } } : {}),
    },
  };
}

describe('StepDeposit one-time charges', () => {
  let fixture: ComponentFixture<StepDeposit>;
  let component: StepDeposit;
  let emitted: DepositStepData[];

  async function render(deposit?: DepositStepData): Promise<void> {
    fixture = TestBed.createComponent(StepDeposit);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('detail', onboarding(deposit));
    emitted = [];
    component.next.subscribe((data) => emitted.push(data));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepDeposit],
      providers: [
        { provide: ChargeItemsService, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { can: () => false } },
      ],
    }).compileComponents();
  });

  afterEach(() => fixture.destroy());

  it('restores saved one-time charges and adds them to what is due at move-in', async () => {
    await render({ collectsAdvance: true, advanceMonths: 1, holdsDeposit: true, depositMonths: 2, oneTimeCharges: [KEY_DEPOSIT] });

    expect(component.form.controls.oneTimeCharges.length).toBe(1);
    expect(component.oneTimeTotal()).toBe(1000);
    expect(component.moveInTotal()).toBe(16000);
  });

  it('sends the one-time charges with the step', async () => {
    await render({ collectsAdvance: false, advanceMonths: 0, holdsDeposit: false, depositMonths: 0, oneTimeCharges: [KEY_DEPOSIT] });

    component.submit();

    expect(emitted).toEqual([
      { collectsAdvance: false, advanceMonths: 0, holdsDeposit: false, depositMonths: 0, oneTimeCharges: [KEY_DEPOSIT] },
    ]);
  });

  it('refuses a one-time charge without an item or an amount', async () => {
    await render({
      collectsAdvance: true,
      advanceMonths: 1,
      holdsDeposit: true,
      depositMonths: 2,
      oneTimeCharges: [{ name: 'Key Deposit', billType: 'OTHER', amount: 1000 }],
    });

    component.submit();

    expect(emitted).toEqual([]);
    expect(component.errorMessage()).toBe('Pick a charge and an amount above zero for each one-time charge, or remove it.');
  });

  it('refuses a one-time charge over ₱99,999,999.99 and says so once, under the amount', async () => {
    await render({
      collectsAdvance: false,
      advanceMonths: 0,
      holdsDeposit: false,
      depositMonths: 0,
      oneTimeCharges: [{ ...KEY_DEPOSIT, amount: 500_000_000_000 }],
    });

    component.submit();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(component.errorMessage()).toBe('Max ₱99,999,999.99');
    const amount = fixture.nativeElement.querySelector('#one-time-amount-0') as HTMLInputElement;
    const describedBy = amount.getAttribute('aria-describedby') ?? '';
    expect(fixture.nativeElement.querySelector(`#${describedBy}`)?.textContent?.trim()).toBe('Max ₱99,999,999.99');
    expect(fixture.nativeElement.textContent).not.toContain('Enter an amount.');
  });

  it('leaves the field out when there are none, so an older API still takes the step', async () => {
    await render();

    component.submit();

    expect(emitted).toHaveLength(1);
    expect('oneTimeCharges' in emitted[0]).toBe(false);
  });
});
