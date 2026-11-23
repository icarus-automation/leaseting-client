import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';

import type { AuditEvent } from '../../core/models/audit-event.types';
import { PropertiesService } from '../properties/services/properties.service';
import { AuditEventsService } from './audit-events.service';
import { AuditLog } from './audit-log';

const ROLE_CHANGE: AuditEvent = {
  id: 'e-1',
  action: 'MEMBER_ROLE_CHANGED',
  area: 'team',
  actor: { id: 'u-owner', name: 'Olive Reyes', email: 'olive@example.com' },
  target: { type: 'MEMBER', id: 'm-1', label: 'Ana Cruz <ana@example.com>' },
  propertyId: null,
  before: { role: '6f1c2a9e-4b7d-4c1e-9a3f-2d8b5e7c1a40', roleName: 'Member', propertyIds: ['p-1'] },
  after: { role: '8a2d4c10-5e6f-4b2a-9c3d-1e7f8a9b0c2d', roleName: 'Admin' },
  createdAt: '2026-10-30T02:20:11.000Z',
};

const page = (data: AuditEvent[]) => of({ data, meta: { total: data.length, page: 1, limit: 20, lastPage: 1 } });

describe('AuditLog', { timeout: 15_000 }, () => {
  const audit = { list: vi.fn(), actors: vi.fn() };
  const properties = { list: vi.fn() };
  let fixture: ComponentFixture<AuditLog>;

  beforeEach(async () => {
    audit.actors.mockReturnValue(of([]));
    properties.list.mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 50, lastPage: 1 } }));
    await TestBed.configureTestingModule({
      imports: [AuditLog],
      providers: [
        { provide: AuditEventsService, useValue: audit },
        { provide: PropertiesService, useValue: properties },
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

  it('lists time in Manila, the actor, the action, the target, and the area', async () => {
    audit.list.mockReturnValue(page([ROLE_CHANGE]));
    await render();

    expect(audit.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
    expect(text()).toContain('Oct 30, 2026');
    expect(text()).toContain('10:20 AM');
    expect(text()).toContain('Olive Reyes');
    expect(text()).toContain('Role changed');
    expect(text()).toContain('Ana Cruz <ana@example.com>');
    expect(text()).toContain('Team');
    expect(text()).not.toContain("Changed Ana Cruz's role from Member to Admin");
  });

  it('opens a drawer with the field diff and hides ids', async () => {
    audit.list.mockReturnValue(page([ROLE_CHANGE]));
    await render();

    (fixture.nativeElement.querySelector('tbody tr') as HTMLTableRowElement).click();
    fixture.detectChanges();

    const drawer = text();
    expect(drawer).toContain('Role name');
    expect(drawer).toContain('Member');
    expect(drawer).toContain('Admin');
    expect(drawer).not.toContain('6f1c2a9e-4b7d-4c1e-9a3f-2d8b5e7c1a40');
    expect(drawer).not.toContain('propertyIds');
    expect(drawer).not.toContain('{');
  });

  it('says when nothing has been recorded yet', async () => {
    audit.list.mockReturnValue(page([]));
    await render();

    expect(text()).toContain('No changes yet');
  });

  it('says when no change matches the filters, and sends them to the API', async () => {
    audit.list.mockReturnValue(page([]));
    await render();

    fixture.componentInstance.setArea('bills');
    fixture.componentInstance.setAction('BILL_DELETED');
    fixture.componentInstance.setActor('u-1');
    fixture.componentInstance.setProperty('p-1');
    fixture.componentInstance.setQuery('Maria');
    fixture.componentInstance.setFrom(new Date(2026, 9, 1));
    fixture.componentInstance.setTo(new Date(2026, 9, 31));
    fixture.detectChanges();

    expect(audit.list).toHaveBeenLastCalledWith(
      expect.objectContaining({
        area: 'bills',
        action: 'BILL_DELETED',
        actorId: 'u-1',
        propertyId: 'p-1',
        q: 'Maria',
        from: '2026-10-01',
        to: '2026-10-31',
        page: 1,
        limit: 20,
      }),
    );
    expect(text()).toContain('No changes match');
  });

  it('narrows the action list to the selected area', async () => {
    audit.list.mockReturnValue(page([]));
    await render();

    fixture.componentInstance.setAction('ROLE_DELETED');
    fixture.componentInstance.setArea('bills');

    expect(fixture.componentInstance.action()).toBeNull();
    const labels = fixture.componentInstance.actionOptions().flatMap((group) => group.items.map((item) => item.label));
    expect(labels).toContain('Bill deleted');
    expect(labels).not.toContain('Role deleted');
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

    expect(text()).toContain('Role changed');
    expect(text()).toContain('Ana Cruz <ana@example.com>');
  });

  it('lists people for the actor filter from the events the viewer can see', async () => {
    audit.list.mockReturnValue(page([]));
    audit.actors.mockReturnValue(
      of([
        { id: 'u-1', name: 'Ana Cruz', email: 'ana@example.com' },
        { id: 'u-2', name: 'Ben Santos', email: 'ben@example.com' },
      ]),
    );
    await render();

    expect(fixture.componentInstance.actorOptions()).toEqual([
      { label: 'Ana Cruz', value: 'u-1' },
      { label: 'Ben Santos', value: 'u-2' },
    ]);
  });
});
