import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import type { AuditEvent } from '../../../../core/models/audit-event.types';
import { AuditEventsService } from '../../services/audit-events.service';
import { MembersService } from '../../services/members.service';
import { AuditLog } from './audit-log';

const ROLE_CHANGE: AuditEvent = {
  id: 'e-1',
  action: 'MEMBER_ROLE_CHANGED',
  actor: { id: 'u-owner', name: 'Olive Reyes', email: 'olive@example.com' },
  target: { type: 'MEMBER', id: 'm-1', label: 'Ana Cruz <ana@example.com>' },
  before: { role: 'member', roleName: 'Member' },
  after: { role: 'admin', roleName: 'Admin' },
  createdAt: '2026-10-30T02:20:11.000Z',
};

const page = (data: AuditEvent[]) => of({ data, meta: { total: data.length, page: 1, limit: 20, lastPage: 1 } });

describe('AuditLog', () => {
  const audit = { list: vi.fn() };
  const members = { listAllStaff: vi.fn() };
  let fixture: ComponentFixture<AuditLog>;

  beforeEach(async () => {
    members.listAllStaff.mockReturnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [AuditLog],
      providers: [
        { provide: AuditEventsService, useValue: audit },
        { provide: MembersService, useValue: members },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.clearAllMocks();
  });

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(AuditLog);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const text = () => (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ');

  it('shows placeholder rows while the log loads', async () => {
    audit.list.mockReturnValue(NEVER);
    await render();

    expect(fixture.nativeElement.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
  });

  it('reads each change as a sentence, newest first', async () => {
    audit.list.mockReturnValue(page([ROLE_CHANGE]));
    await render();

    expect(audit.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    expect(text()).toContain('Role changed');
    expect(text()).toContain("Changed Ana Cruz's role from Member to Admin");
    expect(text()).toContain('Olive Reyes');
  });

  it('says when nothing has been recorded yet', async () => {
    audit.list.mockReturnValue(page([]));
    await render();

    expect(text()).toContain('No changes yet');
  });

  it('says when no change matches the filters, and sends them to the API', async () => {
    audit.list.mockReturnValue(page([]));
    await render();

    fixture.componentInstance.setAction('ROLE_DELETED');
    fixture.componentInstance.setFrom(new Date(2026, 9, 1));
    fixture.componentInstance.setTo(new Date(2026, 9, 31));
    fixture.detectChanges();

    expect(audit.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'ROLE_DELETED', from: '2026-10-01', to: '2026-10-31', page: 1 }),
    );
    expect(text()).toContain('No changes match');
  });

  it("shows the API's reason and a Retry when the log fails", async () => {
    audit.list.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403, error: { statusCode: 403, message: 'Insufficient permissions' } })),
    );
    await render();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Insufficient permissions');
    audit.list.mockReturnValue(page([ROLE_CHANGE]));
    (fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(text()).toContain("Changed Ana Cruz's role from Member to Admin");
  });

  it('lists people for the actor filter, marking deactivated ones', async () => {
    audit.list.mockReturnValue(page([]));
    members.listAllStaff.mockReturnValue(
      of([
        { id: 'm-1', userId: 'u-1', name: 'Ana Cruz', status: 'ACTIVE' },
        { id: 'm-2', userId: 'u-2', name: 'Ben Santos', status: 'DEACTIVATED' },
      ]),
    );
    await render();

    expect(fixture.componentInstance.actorOptions()).toEqual([
      { label: 'Ana Cruz', value: 'u-1' },
      { label: 'Ben Santos (deactivated)', value: 'u-2' },
    ]);
  });
});
