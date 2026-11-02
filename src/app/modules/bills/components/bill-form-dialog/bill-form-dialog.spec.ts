import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import type { LeaseListItem } from '../../../../core/models/lease.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { LeasesService } from '../../../leases/services/leases.service';
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

describe('BillFormDialog utility types', () => {
  let fixture: ComponentFixture<BillFormDialog>;
  let component: BillFormDialog;

  beforeEach(async () => {
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
        { provide: BillsService, useValue: { list: vi.fn().mockReturnValue(of({ data: [] })) } },
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
