import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { BillsService } from '../../services/bills.service';
import { BillingRunDialog, type BillingRunKind } from './billing-run-dialog';

describe('BillingRunDialog', () => {
  let fixture: ComponentFixture<BillingRunDialog>;
  let component: BillingRunDialog;
  let billsApi: Record<'rentRunPreview' | 'duesRunPreview' | 'rentRun' | 'duesRun', ReturnType<typeof vi.fn>>;
  let toast: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    billsApi = {
      rentRunPreview: vi.fn().mockReturnValue(of({ count: 5 })),
      duesRunPreview: vi.fn().mockReturnValue(of({ count: 1 })),
      rentRun: vi.fn().mockReturnValue(of({ created: 5, skipped: 2 })),
      duesRun: vi.fn().mockReturnValue(of({ created: 1, skipped: 0 })),
    };
    toast = { add: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [BillingRunDialog],
      providers: [
        { provide: BillsService, useValue: billsApi },
        { provide: MessageService, useValue: toast },
        { provide: ConfirmService, useValue: { danger: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BillingRunDialog);
    component = fixture.componentInstance;
  });

  afterEach(() => fixture.destroy());

  async function open(kind: BillingRunKind): Promise<void> {
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const body = () => document.body.textContent?.replace(/\s+/g, ' ') ?? '';
  const runButton = () =>
    [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === 'Run')!;

  it('shows how many rent bills the run will create before it runs', async () => {
    await open('rent');

    expect(billsApi.rentRunPreview).toHaveBeenCalledTimes(1);
    expect(billsApi.rentRun).not.toHaveBeenCalled();
    expect(body()).toContain('Generate rent bills');
    expect(body()).toContain('5 rent bills will be created.');
    expect(runButton().disabled).toBe(false);
  });

  it('runs on confirm, closes, and reports what it created', async () => {
    await open('rent');
    const created: number[] = [];
    component.created.subscribe((count) => created.push(count));

    runButton().click();
    fixture.detectChanges();

    expect(billsApi.rentRun).toHaveBeenCalledTimes(1);
    expect(created).toEqual([5]);
    expect(component.visible()).toBe(false);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: '5 rent bills created' }));
  });

  it('says nothing is due and keeps Run off when the count is 0', async () => {
    billsApi.rentRunPreview.mockReturnValue(of({ count: 0 }));
    await open('rent');

    expect(body()).toContain('Nothing is due.');
    expect(runButton().disabled).toBe(true);
    component.run();
    expect(billsApi.rentRun).not.toHaveBeenCalled();
  });

  it('uses the dues preview and run for association dues, with a singular count', async () => {
    await open('dues');

    expect(billsApi.duesRunPreview).toHaveBeenCalledTimes(1);
    expect(billsApi.rentRunPreview).not.toHaveBeenCalled();
    expect(body()).toContain('Generate association dues');
    expect(body()).toContain('1 association dues bill will be created.');

    runButton().click();
    expect(billsApi.duesRun).toHaveBeenCalledTimes(1);
  });

  it('keeps Run off while the count cannot be read', async () => {
    billsApi.rentRunPreview.mockReturnValue(throwError(() => new Error('offline')));
    await open('rent');

    expect(component.error()).not.toBeNull();
    expect(runButton().disabled).toBe(true);
  });
});
