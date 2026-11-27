import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import type { UtilityRunPreviewRow } from '../../../../core/models/bill.types';
import { PropertiesService } from '../../../properties/services/properties.service';
import { BillsService } from '../../services/bills.service';
import { UtilityRun } from './utility-run';

const PREVIEW: UtilityRunPreviewRow[] = [
  { leaseId: 'lease-102', unitNo: '102', residentName: 'Maria Santos', dueDay: 17, previousReading: '2956', lastPeriodTo: '2026-11-01' },
  { leaseId: 'lease-104', unitNo: '104', residentName: 'Ana Reyes', dueDay: 28, previousReading: null, lastPeriodTo: null },
  { leaseId: 'lease-105', unitNo: '105', residentName: 'Mark Bello', dueDay: 11, previousReading: '2064', lastPeriodTo: '2026-10-01' },
];

describe('UtilityRun readings table', () => {
  let fixture: ComponentFixture<UtilityRun>;
  let component: UtilityRun;
  let billsApi: Record<'utilityRunPreview' | 'createUtilityRun' | 'scanReceipt', ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    billsApi = {
      utilityRunPreview: vi.fn().mockReturnValue(of(PREVIEW)),
      createUtilityRun: vi.fn().mockReturnValue(of({ created: 0, skipped: [] })),
      scanReceipt: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [UtilityRun],
      providers: [
        provideRouter([]),
        { provide: BillsService, useValue: billsApi },
        { provide: PropertiesService, useValue: { list: () => of({ data: [{ id: 'prop-1', name: 'Brickstone' }] }) } },
        { provide: MessageService, useValue: { add: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UtilityRun);
    component = fixture.componentInstance;
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();

    component.setupForm.controls.propertyId.setValue('prop-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    (fixture.nativeElement as HTMLElement).remove();
  });

  const host = () => fixture.nativeElement as HTMLElement;
  const present = (index: number) => host().querySelector<HTMLInputElement>(`#run-present-${index}`)!;
  const statusText = (index: number) => host().querySelector(`#run-status-${index}`)!.textContent!.replace(/\s+/g, ' ').trim();

  it('says which units are listed, in one line above the table', () => {
    expect(host().textContent).toContain(
      'Showing 3 units with an active lease or current owner that Leaseting bills for electricity.',
    );
  });

  it('asks for each reading with "Enter reading" and focuses the first empty Present', () => {
    expect(present(0).placeholder).toBe('Enter reading');
    expect(host().querySelector<HTMLInputElement>('#run-previous-1')!.placeholder).toBe('Enter reading');
    expect(document.activeElement).toBe(present(0));
  });

  it('labels blank rows "Needs reading" and never dims the inputs', () => {
    expect([0, 1, 2].map(statusText)).toEqual(['Needs reading', 'Needs reading', 'Needs reading']);
    expect(host().textContent).not.toContain('skipped');
    for (const row of Array.from(host().querySelectorAll('tbody tr'))) {
      expect(row.className).not.toContain('opacity');
    }
  });

  it('names what each row still needs, then shows its amount', () => {
    component.updateRow(0, { present: 2900 });
    component.updateRow(1, { present: 120 });
    component.updateRow(2, { present: 2100 });
    fixture.detectChanges();

    expect(statusText(0)).toBe('Lower than previous');
    expect(statusText(1)).toBe('No previous reading');
    expect(statusText(2)).toBe('Set a rate first');
    expect(present(2).getAttribute('aria-describedby')).toBe('run-status-2');

    component.setRateMode('direct');
    component.rateForm.controls.ratePerUnit.setValue(10);
    fixture.detectChanges();

    expect(statusText(2)).toBe('₱360.00');
    expect(present(2).hasAttribute('aria-describedby')).toBe(false);
    expect(component.filledCount()).toBe(1);
  });

  it('moves Enter in a Present reading to the next row instead of submitting', () => {
    const submit = vi.spyOn(component, 'onSubmit');
    present(0).focus();

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    present(0).dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(present(1));
    expect(submit).not.toHaveBeenCalled();
    expect(billsApi.createUtilityRun).not.toHaveBeenCalled();
  });

  it('shows the VAT and withholding helpers in plain terms', () => {
    component.showTaxes.set(true);
    fixture.detectChanges();

    expect(host().querySelector('#run-vat-help')!.textContent!.trim()).toBe(
      "Only if you're VAT-registered. The provider's VAT is already in the bill total.",
    );
    expect(host().querySelector('#run-wht-help')!.textContent!.trim()).toBe('Only if the tenant withholds, usually a company.');
    expect(component.rateForm.controls.vatPct.value).toBe(0);
    expect(component.rateForm.controls.whtPct.value).toBe(0);
  });

  it('applies taxes to the whole charge unless the landlord picks the admin fee only, and sends the choice', () => {
    component.showTaxes.set(true);
    component.setRateMode('direct');
    component.rateForm.patchValue({ ratePerUnit: 10, adminFeePct: 10, vatPct: 12, whtPct: 2 });
    component.updateRow(2, { present: 2100 });
    fixture.detectChanges();

    const basisButtons = Array.from(host().querySelectorAll<HTMLButtonElement>('[aria-label="Apply taxes to"] button'));
    expect(basisButtons.map((button) => [button.textContent!.trim(), button.getAttribute('aria-pressed')])).toEqual([
      ['Whole charge', 'true'],
      ['Admin fee only', 'false'],
    ]);
    // 36 × ₱10 = 360; fee 36; on the whole 396: VAT 12% = 47.52, withholding 2% = 7.92
    expect(statusText(2)).toBe('₱435.60');

    basisButtons[1].click();
    fixture.detectChanges();
    // On the ₱36 fee alone: VAT 4.32, withholding 0.72
    expect(statusText(2)).toBe('₱399.60');

    component.onSubmit();
    expect(billsApi.createUtilityRun).toHaveBeenCalledWith(
      expect.objectContaining({ vatRate: 0.12, whtRate: 0.02, taxBasis: 'ADMIN_FEE', adminFeeRate: 0.1 }),
    );
  });
});
