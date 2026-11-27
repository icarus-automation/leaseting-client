import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { LeaseTermsStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';
import type { PropertyDetail } from '../../../../core/models/property.types';
import { PropertiesService } from '../../../properties/services/properties.service';
import { UnitsService } from '../../../properties/services/units.service';
import { ChargeItemsService } from '../../../settings/services/charge-items.service';
import { createChargeLineGroup } from '../components/charge-lines/charge-line-form';
import { StepLeaseTerms } from './step-lease-terms';

function property(overrides: Partial<PropertyDetail> = {}): PropertyDetail {
  return {
    id: 'prop-1',
    name: 'Brickstone',
    type: { id: 'type-1', name: 'Boardinghouse' },
    addressLine: '624 Quezon Ave.',
    city: 'Quezon City',
    mode: 'RENTAL',
    imageUrl: null,
    defaultRatePerSqm: null,
    duesPricingBasis: 'FIXED',
    duesAmount: null,
    duesRatePerSqm: null,
    duesDueDay: 1,
    billsElectricityByDefault: true,
    billsWaterByDefault: true,
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
    floors: [],
    ...overrides,
  };
}

const savedCharges = [{ name: 'Monthly Rent', billType: 'RENT' as const, amount: 4500 }];

function onboarding(leaseTerms?: Partial<LeaseTermsStepData>): OnboardingDetail {
  return {
    id: 'ob-1',
    status: 'IN_PROGRESS',
    currentStepKey: 'lease-terms',
    completedSteps: ['overview', 'resident', 'requirements'],
    totalSteps: 9,
    privacy: {
      notice: { id: 'notice-2', version: 2, publishedAt: '2026-11-03T03:00:00.000Z', publicUrl: 'http://localhost:4200/privacy/org' },
      consent: null,
    },
    resident: { id: 'resident-1', firstName: 'Ada', lastName: 'Lovelace' },
    unit: { id: 'unit-1', unitNo: '103', property: { id: 'prop-1', name: 'Brickstone' } },
    leaseId: null,
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
    stepsState: leaseTerms
      ? { 'lease-terms': { completedAt: '2026-09-26T00:00:00.000Z', data: { ...leaseTerms } } }
      : {},
  };
}

describe('StepLeaseTerms utility billing', () => {
  const propertiesApi = { get: vi.fn() };
  const unitsApi = { get: vi.fn() };

  let fixture: ComponentFixture<StepLeaseTerms>;
  let component: StepLeaseTerms;

  beforeEach(async () => {
    propertiesApi.get.mockReturnValue(of(property({ billsWaterByDefault: false })));
    unitsApi.get.mockReturnValue(of({ pricingBasis: 'FIXED', monthlyRent: '4500.00', computedMonthlyRent: null }));

    await TestBed.configureTestingModule({
      imports: [StepLeaseTerms],
      providers: [
        { provide: PropertiesService, useValue: propertiesApi },
        { provide: UnitsService, useValue: unitsApi },
        { provide: ChargeItemsService, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { can: () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StepLeaseTerms);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  async function render(detail: OnboardingDetail): Promise<void> {
    fixture.componentRef.setInput('detail', detail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function checkbox(key: 'billsElectricity' | 'billsWater'): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector(`#ob-utilities-${key}`) as HTMLInputElement;
  }

  it("prefills both checkboxes from the property's defaults for a new lease", async () => {
    await render(onboarding());

    expect(propertiesApi.get).toHaveBeenCalledWith('prop-1');
    expect(checkbox('billsElectricity').checked).toBe(true);
    expect(checkbox('billsWater').checked).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Filled in from Brickstone's defaults.");
  });

  it('keeps what the step saved over the property defaults', async () => {
    await render(onboarding({ dueDay: 5, charges: savedCharges, billsElectricity: false, billsWater: true }));

    expect(propertiesApi.get).not.toHaveBeenCalled();
    expect(checkbox('billsElectricity').checked).toBe(false);
    expect(checkbox('billsWater').checked).toBe(true);
  });

  it('sends the utility billing with the lease terms', async () => {
    await render(onboarding({ dueDay: 5, charges: savedCharges }));
    const emitted: LeaseTermsStepData[] = [];
    component.next.subscribe((data) => emitted.push(data));

    checkbox('billsElectricity').click();
    fixture.detectChanges();
    component.submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ dueDay: 5, billsElectricity: false, billsWater: false });
  });

  it("does not overwrite a choice made before the property's defaults arrive", async () => {
    component.utilities.controls.billsWater.setValue(true);
    component.utilities.markAsDirty();

    await render(onboarding());

    expect(checkbox('billsWater').checked).toBe(true);
  });
});

describe('StepLeaseTerms charge row', () => {
  let fixture: ComponentFixture<StepLeaseTerms>;
  let component: StepLeaseTerms;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepLeaseTerms],
      providers: [
        { provide: PropertiesService, useValue: { get: () => of(property()) } },
        { provide: UnitsService, useValue: { get: () => of({ pricingBasis: 'FIXED', monthlyRent: '4500.00', computedMonthlyRent: null }) } },
        { provide: ChargeItemsService, useValue: { list: () => of([]) } },
        { provide: AuthService, useValue: { can: () => false } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StepLeaseTerms);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  async function render(detail: OnboardingDetail): Promise<void> {
    fixture.componentRef.setInput('detail', detail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function field(id: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(`#${id}`);
  }

  it('orders the row Charge, Amount, then Description, with Description optional', async () => {
    await render(onboarding({ dueDay: 5, charges: savedCharges }));

    const charge = field('charge-item-0')!;
    const amount = field('charge-amount-0')!;
    const description = field('charge-note-0') as HTMLInputElement;
    expect(charge.compareDocumentPosition(amount) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(amount.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(amount.tagName).toBe('INPUT');
    expect(description.placeholder).toBe('e.g. Includes parking');

    const labels = [...(fixture.nativeElement as HTMLElement).querySelectorAll('li label')].map((label) =>
      label.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(labels).toEqual(['Charge', 'Amount', 'Description (optional)']);
  });

  it('shows a missing amount on the Amount field, focuses it, and does not continue', async () => {
    await render(onboarding({ dueDay: 5, charges: savedCharges }));
    component.charges.at(0).controls.amount.setValue(null);
    const emitted: LeaseTermsStepData[] = [];
    component.next.subscribe((data) => emitted.push(data));

    component.submit();
    fixture.detectChanges();

    expect(emitted).toHaveLength(0);
    expect(field('charge-amount-0-error')?.textContent?.trim()).toBe('Enter an amount.');
    expect(field('charge-amount-0')?.getAttribute('aria-describedby')).toBe('charge-amount-0-error');
    expect(field('charge-item-0-error')).toBeNull();
    expect(document.activeElement).toBe(field('charge-amount-0'));
    expect(component.errorMessage()).toBe('Some charges are missing details.');
  });

  it('shows a missing charge on the Charge field', async () => {
    await render(onboarding({ dueDay: 5, charges: savedCharges }));
    component.charges.push(createChargeLineGroup({ amount: 500 }));
    fixture.detectChanges();

    component.submit();
    fixture.detectChanges();

    expect(field('charge-item-1-error')?.textContent?.trim()).toBe('Pick a charge.');
    expect(field('charge-item-1')?.getAttribute('aria-describedby')).toBe('charge-item-1-error');
    expect(field('charge-amount-1-error')).toBeNull();
    expect(document.activeElement).toBe(field('charge-item-1'));
  });

  it('still sums every charge into the monthly rent', async () => {
    await render(
      onboarding({
        dueDay: 5,
        charges: [...savedCharges, { name: 'Parking', billType: 'OTHER', description: 'Includes parking', amount: 500 }],
      }),
    );
    const emitted: LeaseTermsStepData[] = [];
    component.next.subscribe((data) => emitted.push(data));

    expect(component.monthlyTotal()).toBe(5000);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('5,000.00');

    component.submit();
    expect(emitted[0].charges).toEqual([
      { name: 'Monthly Rent', billType: 'RENT', amount: 4500 },
      { name: 'Parking', billType: 'OTHER', description: 'Includes parking', amount: 500 },
    ]);
  });
});
