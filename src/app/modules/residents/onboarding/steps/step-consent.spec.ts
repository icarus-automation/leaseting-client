import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ONBOARDING_STEP_LABELS,
  ONBOARDING_STEP_ORDER,
  type ConsentStepData,
  type OnboardingDetail,
} from '../../../../core/models/onboarding.types';
import type { OnboardingPrivacy } from '../../../../core/models/privacy.types';
import { CONSENT_ATTESTATION, StepConsent } from './step-consent';

const at = '2026-11-23T02:00:00.000Z';
const currentNotice = {
  id: 'notice-2',
  version: 2,
  publishedAt: '2026-11-03T03:00:00.000Z',
  publicUrl: 'http://localhost:4200/privacy/icarus-automation',
};

function onboarding(privacy: Partial<OnboardingPrivacy> = {}): OnboardingDetail {
  return {
    id: 'ob-1',
    status: 'IN_PROGRESS',
    currentStepKey: 'consent',
    completedSteps: ['overview', 'resident'],
    totalSteps: 9,
    resident: { id: 'resident-1', firstName: 'Ada', lastName: 'Lovelace' },
    unit: { id: 'unit-1', unitNo: '101', property: { id: 'prop-1', name: 'Brickstone' } },
    leaseId: null,
    createdAt: at,
    updatedAt: at,
    stepsState: {},
    privacy: { notice: currentNotice, consent: null, ...privacy },
  };
}

describe('the onboarding consent step', () => {
  it('sits between the tenant and requirements', () => {
    expect(ONBOARDING_STEP_ORDER.slice(1, 4)).toEqual(['resident', 'consent', 'requirements']);
    expect(ONBOARDING_STEP_LABELS.consent).toBe('Consent');
  });
});

describe('StepConsent', () => {
  let fixture: ComponentFixture<StepConsent>;
  let emitted: ConsentStepData[];

  const render = async (detail: OnboardingDetail) => {
    fixture.componentRef.setInput('detail', detail);
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const el = () => fixture.nativeElement as HTMLElement;
  const checkbox = () => el().querySelector<HTMLInputElement>('input[type="checkbox"]');
  const continueButton = () =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Continue to requirements'),
    )!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StepConsent] }).compileComponents();
    fixture = TestBed.createComponent(StepConsent);
    emitted = [];
    fixture.componentInstance.next.subscribe((data) => emitted.push(data));
  });

  afterEach(() => fixture.destroy());

  it('links the current notice and asks for the attestation with the box unticked', async () => {
    await render(onboarding());

    const link = el().querySelector<HTMLAnchorElement>('a[target="_blank"]');
    expect(link?.getAttribute('href')).toBe(currentNotice.publicUrl);
    expect(el().textContent).toContain('Privacy notice · Version 2');
    expect(el().textContent).toContain(CONSENT_ATTESTATION);
    expect(CONSENT_ATTESTATION).toBe('The tenant read the privacy notice and signed the printed consent form.');
    expect(checkbox()?.checked).toBe(false);
  });

  it('keeps requirements blocked until the box is ticked', async () => {
    await render(onboarding());

    expect(continueButton().disabled).toBe(true);
    continueButton().click();
    expect(emitted).toEqual([]);

    checkbox()!.click();
    fixture.detectChanges();

    expect(continueButton().disabled).toBe(false);
    continueButton().click();
    expect(emitted).toEqual([{ attested: true, noticeVersionId: 'notice-2' }]);
  });

  it('blocks again when the box is unticked', async () => {
    await render(onboarding());

    checkbox()!.click();
    checkbox()!.click();
    fixture.detectChanges();

    expect(continueButton().disabled).toBe(true);
  });

  it('shows who recorded consent to the current version and lets staff continue', async () => {
    await render(
      onboarding({
        consent: {
          id: 'consent-1',
          noticeVersion: 2,
          recordedAt: at,
          recordedBy: { id: 'user-1', name: 'Leaseting Admin', email: 'admin@leaseting.com' },
        },
      }),
    );

    expect(el().textContent).toContain('Consent to version 2 recorded');
    expect(el().textContent).toContain('by Leaseting Admin');
    expect(checkbox()).toBeNull();
    expect(continueButton().disabled).toBe(false);
  });

  it('asks again when a newer notice came out after consent was recorded', async () => {
    await render(
      onboarding({
        consent: { id: 'consent-1', noticeVersion: 1, recordedAt: at, recordedBy: null },
      }),
    );

    expect(el().textContent).toContain('Version 2 came out since');
    expect(checkbox()?.checked).toBe(false);
    expect(continueButton().disabled).toBe(true);
  });
});
