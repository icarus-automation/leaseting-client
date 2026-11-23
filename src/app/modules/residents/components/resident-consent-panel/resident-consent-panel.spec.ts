import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import type { ResidentPrivacyConsents } from '../../../../core/models/privacy.types';
import { ResidentsService } from '../../services/residents.service';
import { ResidentConsentPanel, consentSummary } from './resident-consent-panel';

const v1 = { id: 'notice-1', version: 1, publishedAt: '2026-06-01T00:00:00.000Z' };
const v2 = { id: 'notice-2', version: 2, publishedAt: '2026-11-03T03:00:00.000Z' };
const admin = { id: 'user-1', name: 'Leaseting Admin', email: 'admin@leaseting.com' };
const lauren = { id: 'user-2', name: 'Lauren Tan', email: 'lauren.tan@gmail.com' };

function record(overrides: Partial<ResidentPrivacyConsents> = {}): ResidentPrivacyConsents {
  return {
    currentNotice: { ...v2, publicUrl: 'http://localhost:4200/privacy/icarus-automation' },
    current: { accepted: false, staffAttestedAt: null, tenantAppAt: null },
    consents: [
      {
        id: 'c-2',
        source: 'TENANT_APP',
        noticeVersion: v1,
        recordedAt: '2026-10-13T05:00:00.000Z',
        recordedBy: lauren,
        onboardingId: null,
      },
      {
        id: 'c-1',
        source: 'STAFF_ATTESTED',
        noticeVersion: v1,
        recordedAt: '2026-10-12T02:00:00.000Z',
        recordedBy: admin,
        onboardingId: 'ob-1',
      },
    ],
    ...overrides,
  };
}

const day = (iso: string) => iso.slice(0, 10);

describe('consentSummary', () => {
  it('flags a tenant who has not accepted the latest version', () => {
    expect(consentSummary(record(), day)).toEqual({
      tone: 'warning',
      label: 'Version 2 not accepted',
      detail: 'Last accepted version 1. Residence Care asks again the next time the tenant opens it.',
    });
  });

  it('says how the latest version was accepted', () => {
    const accepted = record({
      current: { accepted: true, staffAttestedAt: '2026-11-04T02:00:00.000Z', tenantAppAt: '2026-11-05T02:00:00.000Z' },
    });

    expect(consentSummary(accepted, day)).toEqual({
      tone: 'success',
      label: 'Accepted version 2',
      detail: 'Agreed in Residence Care on 2026-11-05, and on a signed form attested 2026-11-04.',
    });
  });

  it('says when there is no consent on record at all', () => {
    expect(consentSummary(record({ consents: [] }), day).detail).toContain('No consent on record yet.');
  });
});

describe('ResidentConsentPanel', () => {
  let fixture: ComponentFixture<ResidentConsentPanel>;
  const residents = { privacyConsents: vi.fn() };

  beforeEach(async () => {
    residents.privacyConsents.mockReturnValue(of(record()));
    await TestBed.configureTestingModule({
      imports: [ResidentConsentPanel],
      providers: [{ provide: ResidentsService, useValue: residents }],
    }).compileComponents();
    fixture = TestBed.createComponent(ResidentConsentPanel);
    fixture.componentRef.setInput('residentId', 'resident-1');
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('lists the history with version, how, who, and when', () => {
    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim()),
    );

    expect(residents.privacyConsents).toHaveBeenCalledWith('resident-1');
    expect(rows.map((row) => row.slice(0, 3))).toEqual([
      ['v1', 'Agreed in Residence Care', 'Lauren Tan (tenant)'],
      ['v1', 'Signed form, attested by staff', 'Leaseting Admin'],
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Version 2 not accepted');
  });
});
