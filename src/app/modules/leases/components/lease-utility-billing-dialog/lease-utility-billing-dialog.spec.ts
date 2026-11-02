import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { LeaseDetail, LeaseUtilityBilling } from '../../../../core/models/lease.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { LeasesService } from '../../services/leases.service';
import { LeaseUtilityBillingDialog } from './lease-utility-billing-dialog';

function lease(overrides: Partial<LeaseDetail> = {}): LeaseDetail {
  return {
    id: 'lease-1',
    startDate: '2026-09-21',
    endDate: '2027-09-21',
    monthlyRent: '4500.00',
    rentCharges: null,
    rentPricingBasis: 'FIXED',
    rentFloorAreaSqm: null,
    rentRatePerSqm: null,
    dueDay: 1,
    terminatedAt: null,
    notes: null,
    billsElectricity: false,
    billsWater: true,
    unitId: 'unit-1',
    residentId: 'resident-1',
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
    resident: { id: 'resident-1', firstName: 'Lauren', lastName: 'Tan' },
    unit: { id: 'unit-1', unitNo: '103', property: { id: 'prop-1', name: 'Brickstone' } },
    bills: [],
    ...overrides,
  };
}

describe('LeaseUtilityBillingDialog', () => {
  const leasesApi = { update: vi.fn() };

  let fixture: ComponentFixture<LeaseUtilityBillingDialog>;
  let component: LeaseUtilityBillingDialog;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaseUtilityBillingDialog],
      providers: [
        { provide: LeasesService, useValue: leasesApi },
        { provide: ConfirmService, useValue: { danger: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeaseUtilityBillingDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('lease', lease());
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  it("opens on the lease's current settings", () => {
    expect(component.group.getRawValue()).toEqual({ billsElectricity: false, billsWater: true });
    expect(component.group.dirty).toBe(false);
  });

  it('saves both settings to the lease and reports what the API stored', () => {
    leasesApi.update.mockReturnValue(of({ ...lease(), billsElectricity: true, billsWater: true }));
    const saved: LeaseUtilityBilling[] = [];
    component.saved.subscribe((billing) => saved.push(billing));

    component.group.controls.billsElectricity.setValue(true);
    component.onSubmit();

    expect(leasesApi.update).toHaveBeenCalledWith('lease-1', { billsElectricity: true, billsWater: true });
    expect(saved).toEqual([{ billsElectricity: true, billsWater: true }]);
    expect(component.visible()).toBe(false);
  });

  it('saves from the Save changes button, without the browser submitting the form itself', () => {
    leasesApi.update.mockReturnValue(of({ ...lease(), billsElectricity: true }));
    const checkbox = document.body.querySelector<HTMLInputElement>('#lease-utilities-billsElectricity')!;
    const save = [...document.body.querySelectorAll<HTMLButtonElement>('button[type="submit"]')].find(
      (button) => button.textContent?.includes('Save changes'),
    )!;
    const submitted = vi.fn((event: Event) => event.defaultPrevented);
    document.body.querySelector('#lease-utility-billing-form')!.addEventListener('submit', submitted);

    checkbox.click();
    save.click();

    expect(leasesApi.update).toHaveBeenCalledWith('lease-1', { billsElectricity: true, billsWater: true });
    expect(submitted).toHaveReturnedWith(true);
  });

  it('stays open with the reason when the API refuses', () => {
    leasesApi.update.mockReturnValue(
      throwError(() => ({ status: 409, error: { message: 'Cannot update a terminated lease' } })),
    );

    component.onSubmit();

    expect(component.visible()).toBe(true);
    expect(component.errorMessage()).toBe('Cannot update a terminated lease');
  });
});
