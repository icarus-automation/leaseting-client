import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import type { ChargeItemResponse } from '../../../../core/models/charge-item.types';
import type { LeaseListItem } from '../../../../core/models/lease.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { LeasesService } from '../../../leases/services/leases.service';
import { ChargeItemsService } from '../../../settings/services/charge-items.service';
import { BillsService } from '../../services/bills.service';
import { BillFormDialog } from './bill-form-dialog';

function lease(id: string, billing: { billsElectricity: boolean; billsWater: boolean }): LeaseListItem {
  return {
    id,
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
    unitId: 'unit-1',
    residentId: 'resident-1',
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
    resident: { id: 'resident-1', firstName: 'Lauren', lastName: 'Tan' },
    unit: { id: 'unit-1', unitNo: '103', property: { id: 'prop-1', name: 'Brickstone' } },
    ...billing,
  };
}

function chargeItem(overrides: Partial<ChargeItemResponse>): ChargeItemResponse {
  return {
    id: 'key',
    name: 'Key Deposit',
    billType: 'OTHER',
    defaultAmount: '1000.00',
    isArchived: false,
    frequency: 'ONE_TIME',
    isSystem: false,
    systemKey: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const CHARGE_ITEMS = [
  chargeItem({}),
  chargeItem({ id: 'parking', name: 'Parking', defaultAmount: null, frequency: 'MONTHLY' }),
  chargeItem({ id: 'late', name: 'Late fee', defaultAmount: null, isSystem: true, systemKey: 'LATE_FEE' }),
  chargeItem({ id: 'deposit', name: 'Security Deposit', defaultAmount: null, isSystem: true, systemKey: 'SECURITY_DEPOSIT' }),
  chargeItem({ id: 'old', name: 'Gate card', isArchived: true }),
];

describe('BillFormDialog utility types', () => {
  let fixture: ComponentFixture<BillFormDialog>;
  let component: BillFormDialog;
  let billsApi: { list: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    billsApi = { list: vi.fn().mockReturnValue(of({ data: [] })), create: vi.fn().mockReturnValue(of({})) };
    const leasesApi = {
      list: vi.fn().mockReturnValue(
        of({
          data: [
            lease('lease-water-only', { billsElectricity: false, billsWater: true }),
            lease('lease-both', { billsElectricity: true, billsWater: true }),
          ],
          meta: { total: 2, page: 1, limit: 50, lastPage: 1 },
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [BillFormDialog],
      providers: [
        provideRouter([]),
        { provide: LeasesService, useValue: leasesApi },
        { provide: BillsService, useValue: billsApi },
        { provide: ChargeItemsService, useValue: { list: () => of(CHARGE_ITEMS) } },
        { provide: ConfirmService, useValue: { danger: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillFormDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  const disabledTypes = () => component.typeOptions().filter((option) => option.disabled).map((option) => option.value);


  it('offers live charge items to bill by hand, never a system item', () => {
    expect(component.chargeOptions().map((option) => option.label)).toEqual(['Key Deposit · One-time', 'Parking · Monthly']);
  });

  it("takes a picked charge item's type and default amount, and frees the type when cleared", () => {
    component.form.controls.chargeItemId.setValue('key');

    expect(component.form.controls.type.value).toBe('OTHER');
    expect(component.form.controls.type.disabled).toBe(true);
    expect(component.form.controls.amount.value).toBe(1000);

    component.form.controls.chargeItemId.setValue(null as unknown as string);

    expect(component.form.controls.type.enabled).toBe(true);
  });

  it("replaces the lease's rent filled in for staff, but keeps an amount they typed", () => {
    component.form.controls.leaseId.setValue('lease-both');
    expect(component.form.controls.amount.value).toBe(4500);

    component.form.controls.chargeItemId.setValue('parking');
    expect(component.form.controls.amount.value).toBeNull();

    component.form.controls.amount.setValue(750);
    component.form.controls.amount.markAsDirty();
    component.form.controls.chargeItemId.setValue('key');
    expect(component.form.controls.amount.value).toBe(750);
  });

  it('sends the picked charge item with the bill', () => {
    component.form.controls.leaseId.setValue('lease-both');
    component.form.controls.chargeItemId.setValue('key');
    component.form.controls.dueDate.setValue(new Date(2026, 10, 5));

    component.onSubmit();

    expect(billsApi.create).toHaveBeenCalledWith(
      'lease-both',
      expect.objectContaining({ type: 'OTHER', chargeItemId: 'key', amount: 1000, dueDate: '2026-11-05' }),
    );
  });

  it('applies taxes to the whole charge by default, lets staff pick the admin fee only, and sends the choice', () => {
    component.form.controls.leaseId.setValue('lease-both');
    component.form.controls.type.setValue('WATER');
    component.form.controls.dueDate.setValue(new Date(2026, 10, 5));
    component.toggleReadingMode(true);
    component.readingForm.patchValue({
      periodFrom: new Date(2026, 9, 1),
      periodTo: new Date(2026, 9, 31),
      previousReading: 520,
      presentReading: 590,
      multiplier: 13,
      adminFeePct: 10,
      vatPct: 12,
      whtPct: 2,
    });
    fixture.detectChanges();

    // The dialog renders its body outside the host element.
    const basisButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[aria-label="Apply taxes to"] button'));
    expect(basisButtons.map((button) => [button.textContent!.trim(), button.getAttribute('aria-pressed')])).toEqual([
      ['Whole charge', 'true'],
      ['Admin fee only', 'false'],
    ]);
    expect(component.breakdown()!.lines.map((line) => [line.label, line.amount])).toEqual([
      ['Subtotal', 910],
      ['Admin fee', 91],
      ['VAT (12%)', 120.12],
      ['Withholding (2%)', -20.02],
      ['Total', 1101.1],
    ]);

    basisButtons[1].click();
    fixture.detectChanges();
    expect(component.breakdown()!.netDue).toBe(1010.1);

    component.onSubmit();
    expect(billsApi.create).toHaveBeenCalledWith(
      'lease-both',
      expect.objectContaining({
        type: 'WATER',
        amount: 1010.1,
        utilityDetail: expect.objectContaining({ vatRate: 0.12, whtRate: 0.02, taxBasis: 'ADMIN_FEE' }) as object,
      }),
    );
  });

  it("greys out electricity for a lease where Leaseting doesn't bill it", () => {
    component.form.controls.leaseId.setValue('lease-water-only');

    expect(disabledTypes()).toEqual(['ELECTRICITY']);
  });

  it('offers every type for a lease that bills both utilities, and before a lease is picked', () => {
    expect(disabledTypes()).toEqual([]);

    component.form.controls.leaseId.setValue('lease-both');

    expect(disabledTypes()).toEqual([]);
  });

  it('says why when the chosen type is one the lease does not bill', () => {
    component.form.controls.type.setValue('ELECTRICITY');
    component.form.controls.leaseId.setValue('lease-water-only');

    expect(component.unbilledTypeHint()).toBe(
      "Leaseting doesn't bill electricity on this lease. Change it on the lease, under Utility billing.",
    );

    component.form.controls.type.setValue('WATER');

    expect(component.unbilledTypeHint()).toBeNull();
  });
});
