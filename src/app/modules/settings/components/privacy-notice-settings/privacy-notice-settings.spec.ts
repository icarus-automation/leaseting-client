import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { PrivacyNotice } from '../../../../core/models/privacy.types';
import { PrivacyNoticeService } from '../../../../core/privacy/privacy-notice.service';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { PrivacyNoticeSettings, noticeDraftProblem, normalizeNoticeDraft } from './privacy-notice-settings';

const STARTER = 'Brickstone Living ("we") manages the property you rent or own.\n\n## What we collect\n- Your name.';
const OURS = `${STARTER}\n- CCTV footage of the lobby, kept for 30 days.`;

function notice(overrides: Partial<PrivacyNotice> = {}): PrivacyNotice {
  const starter = {
    id: 'notice-1',
    version: 1,
    isStarter: true,
    publishedAt: '2026-06-01T00:00:00.000Z',
    publishedBy: null,
  };
  return {
    current: { ...starter, body: STARTER },
    versions: [starter],
    publicUrl: 'http://localhost:4200/privacy/brickstone-living',
    needsReview: true,
    ...overrides,
  };
}

const version2 = {
  id: 'notice-2',
  version: 2,
  isStarter: false,
  publishedAt: '2026-11-23T02:00:00.000Z',
  publishedBy: { id: 'user-1', name: 'Leaseting Admin', email: 'admin@leaseting.com' },
};

describe('noticeDraftProblem', () => {
  it('lets the owner adopt the starter as it stands', () => {
    expect(noticeDraftProblem(STARTER, notice())).toBeNull();
  });

  it('asks for an edit before a version that is not the starter is published again', () => {
    const reviewed = notice({ current: { ...version2, body: OURS }, needsReview: false });

    expect(noticeDraftProblem(`${OURS}  \r\n`, reviewed)).toBe('Edit the notice before you publish a new version.');
    expect(noticeDraftProblem(`${OURS}\n- And your plate number.`, reviewed)).toBeNull();
  });

  it('refuses a notice too short to mean anything', () => {
    expect(noticeDraftProblem('We keep your ID.', notice())).toBe('Write the full notice. It is too short to publish.');
  });

  it('normalizes the draft the way the API stores it', () => {
    expect(normalizeNoticeDraft('  ## Heading  \r\n- One \r\n\r\n')).toBe('## Heading\n- One');
  });
});

describe('PrivacyNoticeSettings', () => {
  let fixture: ComponentFixture<PrivacyNoticeSettings>;
  const api = { get: vi.fn(), version: vi.fn(), publish: vi.fn() };
  const auth = { can: vi.fn((_code: string) => true) };
  const confirm = { proceed: vi.fn((options: { onAccept: () => void }) => options.onAccept()) };
  const toast = { add: vi.fn() };

  const el = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    [...el().querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
      candidate.textContent?.includes(label),
    );

  beforeEach(async () => {
    api.get.mockReturnValue(of(notice()));
    api.publish.mockReset();
    api.version.mockReset();
    confirm.proceed.mockClear();
    auth.can.mockImplementation(() => true);

    await TestBed.configureTestingModule({
      imports: [PrivacyNoticeSettings],
      providers: [
        { provide: PrivacyNoticeService, useValue: api },
        { provide: AuthService, useValue: auth },
        { provide: ConfirmService, useValue: confirm },
        { provide: MessageService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PrivacyNoticeSettings);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  it('asks the owner to review the starter and shows its public link', () => {
    expect(el().textContent).toContain('Review your privacy notice');
    expect(el().textContent).toContain('Starter, not reviewed');
    const link = el().querySelector<HTMLInputElement>('input[readonly]');
    expect(link?.value).toBe('http://localhost:4200/privacy/brickstone-living');
  });

  it('publishes the edit as version 2 and shows it as current', async () => {
    api.publish.mockReturnValue(
      of(
        notice({
          current: { ...version2, body: OURS },
          versions: [version2, notice().versions[0]],
          needsReview: false,
        }),
      ),
    );
    fixture.componentInstance.body.setValue(OURS);
    fixture.detectChanges();

    button('Publish version 2')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(confirm.proceed).toHaveBeenCalledWith(expect.objectContaining({ header: 'Publish version 2?' }));
    expect(api.publish).toHaveBeenCalledWith(OURS);
    expect(el().textContent).not.toContain('Review your privacy notice');
    expect(el().textContent).toContain('Version 2');
    expect(button('Publish version 3')).toBeDefined();
    expect(el().textContent).toContain('Leaseting Admin');
  });

  it('opens an earlier version to read', async () => {
    api.get.mockReturnValue(
      of(notice({ current: { ...version2, body: OURS }, versions: [version2, notice().versions[0]], needsReview: false })),
    );
    fixture.componentInstance.load();
    fixture.detectChanges();
    api.version.mockReturnValue(of({ ...notice().versions[0], body: STARTER }));

    button('Read version 1')!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(api.version).toHaveBeenCalledWith(1);
    expect(el().querySelector('#privacy-version-1')?.textContent).toContain('What we collect');
  });

  it('shows the notice read-only to someone who cannot publish', async () => {
    auth.can.mockImplementation(() => false);
    fixture.destroy();
    fixture = TestBed.createComponent(PrivacyNoticeSettings);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el().querySelector('textarea')).toBeNull();
    expect(button('Publish version')).toBeUndefined();
    expect(el().textContent).toContain('Only owners and admins can publish a new version.');
  });
});
