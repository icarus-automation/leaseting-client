import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { OnboardingDetail } from '../../../../core/models/onboarding.types';
import type { ResidentDetail, ResidentDocumentItem } from '../../../../core/models/resident.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { ResidentsService } from '../../services/residents.service';
import { StepRequirements } from './step-requirements';

function documentItem(overrides: Partial<ResidentDocumentItem> = {}): ResidentDocumentItem {
  return {
    id: 'doc-1',
    fileName: 'philsys.png',
    mimeType: 'image/png',
    sizeBytes: 1200,
    label: 'Onboarding · Valid ID',
    createdAt: '2026-09-26T00:00:00.000Z',
    ...overrides,
  };
}

function residentDetail(overrides: Partial<ResidentDetail> = {}): ResidentDetail {
  return {
    id: 'resident-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: null,
    contactNo: '09170000000',
    photoUrl: null,
    notes: null,
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
    leases: [],
    ownerships: [],
    documents: [],
    outstandingBalance: '0',
    unpaidBillCount: 0,
    nextDueDate: null,
    ...overrides,
  };
}

function onboarding(overrides: Partial<OnboardingDetail> = {}): OnboardingDetail {
  return {
    id: 'ob-1',
    status: 'IN_PROGRESS',
    currentStepKey: 'requirements',
    completedSteps: ['overview', 'resident'],
    totalSteps: 9,
    privacy: {
      notice: { id: 'notice-2', version: 2, publishedAt: '2026-11-03T03:00:00.000Z', publicUrl: 'http://localhost:4200/privacy/org' },
      consent: null,
    },
    resident: { id: 'resident-1', firstName: 'Ada', lastName: 'Lovelace' },
    unit: { id: 'unit-1', unitNo: '101', property: { id: 'prop-1', name: 'Brickstone' } },
    leaseId: null,
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
    stepsState: {},
    ...overrides,
  };
}

describe('StepRequirements', () => {
  const residentsApi = {
    get: vi.fn(),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    documentFile: vi.fn(),
  };
  const auth = { can: vi.fn((_code: string) => false) };
  const confirm = {
    danger: vi.fn((options: { onAccept: () => void }) => options.onAccept()),
  };

  let fixture: ComponentFixture<StepRequirements>;
  let component: StepRequirements;

  beforeEach(async () => {
    residentsApi.get.mockReturnValue(of(residentDetail()));
    residentsApi.uploadDocument.mockReset();
    residentsApi.deleteDocument.mockReset();
    residentsApi.documentFile.mockReset();
    auth.can.mockReset();
    auth.can.mockReturnValue(false);
    confirm.danger.mockClear();

    await TestBed.configureTestingModule({
      imports: [StepRequirements],
      providers: [
        { provide: ResidentsService, useValue: residentsApi },
        { provide: ConfirmService, useValue: confirm },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(StepRequirements);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  async function render(detail: OnboardingDetail = onboarding()): Promise<void> {
    fixture.componentRef.setInput('detail', detail);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function nextButton(): HTMLButtonElement {
    const buttons: HTMLButtonElement[] = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
    return buttons.find((button) => button.textContent?.includes('Next: Lease terms'))!;
  }

  function checkbox(label: string): HTMLInputElement {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(`input[type="checkbox"][aria-label^="${label}"]`)!;
  }

  function attachFile(key: 'validId' | 'proofOfIncome' | 'priorAddress', file = new File(['id'], 'id.png', { type: 'image/png' })): void {
    component.attach(key);
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    component.onFilePicked({ target: input } as unknown as Event);
  }

  it('keeps required rows unchecked and Next blocked when no file is attached', async () => {
    await render();

    expect(checkbox('Valid government ID').checked).toBe(false);
    expect(checkbox('Proof of income').checked).toBe(false);
    expect(checkbox('Prior address / references').checked).toBe(false);
    expect(component.canProceed()).toBe(false);
    expect(nextButton().disabled).toBe(true);
  });

  it('does not let staff tick a requirement by hand', async () => {
    await render();

    const box = checkbox('Valid government ID');
    expect(box.classList.contains('pointer-events-none')).toBe(true);
    expect(box.getAttribute('aria-readonly')).toBe('true');
    expect(box.tabIndex).toBe(-1);

    box.checked = true;
    const event = new Event('change', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { value: box });
    component.rejectManualCheck(event, 'validId');

    expect(component.isAttached('validId')).toBe(false);
    expect(checkbox('Valid government ID').checked).toBe(false);
    expect(nextButton().disabled).toBe(true);
  });

  it('ignores a saved checked flag when no file is on the tenant profile', async () => {
    await render(
      onboarding({
        stepsState: {
          requirements: {
            completedAt: '2026-09-26T00:00:00.000Z',
            data: { validId: true, proofOfIncome: true, priorAddress: true },
          },
        },
      }),
    );

    expect(component.isAttached('validId')).toBe(false);
    expect(component.canProceed()).toBe(false);
    expect(nextButton().disabled).toBe(true);
  });

  it('marks a requirement checked after a file is attached and enables Next for required items', async () => {
    residentsApi.uploadDocument.mockReturnValue(of(documentItem()));
    await render();

    attachFile('validId');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(residentsApi.uploadDocument).toHaveBeenCalledWith('resident-1', expect.any(File), 'Onboarding · Valid ID');
    expect(component.isAttached('validId')).toBe(true);
    expect(checkbox('Valid government ID').checked).toBe(true);
    expect(checkbox('Proof of income').checked).toBe(false);
    expect(component.canProceed()).toBe(true);
    expect(nextButton().disabled).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('philsys.png');
  });

  it('lets optional items stay skipped while a required file is attached', async () => {
    residentsApi.uploadDocument.mockReturnValue(of(documentItem()));
    await render();

    attachFile('validId');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.isAttached('proofOfIncome')).toBe(false);
    expect(component.isAttached('priorAddress')).toBe(false);
    expect(component.canProceed()).toBe(true);

    let emitted: { validId: boolean; proofOfIncome?: boolean; priorAddress?: boolean } | undefined;
    component.next.subscribe((value) => (emitted = value));
    nextButton().click();

    expect(emitted).toEqual({ validId: true, proofOfIncome: false, priorAddress: false });
  });

  it('clears the checked state and blocks Next when the required file is removed', async () => {
    residentsApi.uploadDocument.mockReturnValue(of(documentItem()));
    residentsApi.deleteDocument.mockReturnValue(of(documentItem()));
    await render();

    attachFile('validId');
    await fixture.whenStable();
    fixture.detectChanges();

    const remove = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.getAttribute('aria-label') === 'Remove philsys.png',
    ) as HTMLButtonElement;
    remove.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(residentsApi.deleteDocument).toHaveBeenCalledWith('doc-1');
    expect(component.isAttached('validId')).toBe(false);
    expect(checkbox('Valid government ID').checked).toBe(false);
    expect(nextButton().disabled).toBe(true);
  });

  it('pre-checks a requirement that is already on the tenant profile', async () => {
    residentsApi.get.mockReturnValue(of(residentDetail({ documents: [documentItem()] })));
    await render();

    expect(component.isAttached('validId')).toBe(true);
    expect(checkbox('Valid government ID').checked).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('On file');
    expect(nextButton().disabled).toBe(false);
  });

  function openButton(): HTMLButtonElement | undefined {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent?.trim() === 'Open',
    );
  }

  it('hides Open when the session cannot view documents', async () => {
    residentsApi.get.mockReturnValue(of(residentDetail({ documents: [documentItem()] })));
    await render();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('philsys.png');
    expect(openButton()).toBeUndefined();
  });

  it('shows Open and requests the document file when the session can view documents', async () => {
    auth.can.mockImplementation((code: string) => code === 'residents:view_documents');
    residentsApi.get.mockReturnValue(of(residentDetail({ documents: [documentItem()] })));
    residentsApi.documentFile.mockReturnValue(of(new Blob(['id'], { type: 'image/png' })));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:doc');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(window, 'open').mockImplementation(() => null);
    await render();

    const open = openButton();
    expect(open).toBeTruthy();
    open!.click();
    await fixture.whenStable();

    expect(residentsApi.documentFile).toHaveBeenCalledWith('doc-1', false);
  });
});
