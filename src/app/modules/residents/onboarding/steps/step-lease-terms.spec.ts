import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { LeaseTermsStepData, OnboardingDetail } from '../../../../core/models/onboarding.types';
import type { PropertyDetail } from '../../../../core/models/property.types';
import { PropertiesService } from '../../../properties/services/properties.service';
import { UnitsService } from '../../../properties/services/units.service';
import { ChargeItemsService } from '../../../settings/services/charge-items.service';
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
    totalSteps: 8,
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
    return fixture.nativeElement.querySelector(`#ob-utilities-${key}`) as HTMLInputElement;
  }

  it("prefills both checkboxes from the property's defaults for a new lease", async () => {
    await render(onboarding());

    expect(propertiesApi.get).toHaveBeenCalledWith('prop-1');
    expect(checkbox('billsElectricity').checked).toBe(true);
    expect(checkbox('billsWater').checked).toBe(false);
    expect(fixture.nativeElement.textContent).toContain("Filled in from Brickstone's defaults.");
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
