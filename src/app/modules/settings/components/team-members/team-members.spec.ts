import { Component, input, model, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import type { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { NEVER, of, throwError } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Permission } from '../../../../core/auth/permissions';
import type { Invitation } from '../../../../core/models/invitation.types';
import type { Member } from '../../../../core/models/member.types';
import type { ParkingAttendantResponse } from '../../../../core/models/parking-attendant.types';
import { EVERY_PROPERTY, type PropertyAccess } from '../../../../core/models/property-access.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { InvitationsService } from '../../services/invitations.service';
import { MembersService } from '../../services/members.service';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import { ResidentLoginsService } from '../../services/resident-logins.service';
import { ResidentLoginLookupError } from '../../utils/resident-login.util';
import { AttendantFormDialog } from '../attendant-form-dialog/attendant-form-dialog';
import { AttendantPasswordDialog } from '../attendant-password-dialog/attendant-password-dialog';
import { ChangeRoleDialog } from '../change-role-dialog/change-role-dialog';
import { InviteStaffDialog } from '../invite-staff-dialog/invite-staff-dialog';
import { PropertyAccessDialog } from '../property-access-dialog/property-access-dialog';
import { ResidentLoginDialog, type ResidentLoginOutcome } from '../resident-login-dialog/resident-login-dialog';
import { TeamMembers } from './team-members';

@Component({ selector: 'app-invite-staff-dialog', template: '' })
class InviteStaffDialogStub {
  readonly visible = model(false);
  readonly invited = output<Invitation>();
}

@Component({ selector: 'app-change-role-dialog', template: '' })
class ChangeRoleDialogStub {
  readonly visible = model(false);
  readonly member = input<Member | null>(null);
  readonly changed = output<Member>();
}

@Component({ selector: 'app-attendant-form-dialog', template: '' })
class AttendantFormDialogStub {
  readonly visible = model(false);
  readonly created = output<ParkingAttendantResponse>();
}

@Component({ selector: 'app-attendant-password-dialog', template: '' })
class AttendantPasswordDialogStub {
  readonly visible = model(false);
  readonly member = input<Member | null>(null);
  readonly passwordReset = output<Member>();
}

@Component({ selector: 'app-resident-login-dialog', template: '' })
class ResidentLoginDialogStub {
  readonly visible = model(false);
  readonly member = input<Member | null>(null);
  readonly finished = output<ResidentLoginOutcome>();
}

@Component({ selector: 'app-property-access-dialog', template: '' })
class PropertyAccessDialogStub {
  readonly visible = model(false);
  readonly member = input<Member | null>(null);
  readonly changed = output<Member>();
}

const BRICKSTONE_ONLY: PropertyAccess = {
  isLimited: true,
  propertyIds: ['p-brickstone'],
  properties: [{ id: 'p-brickstone', name: 'Brickstone', isArchived: false }],
};

function member(overrides: Partial<Member>): Member {
  return {
    id: 'm-x',
    userId: 'u-x',
    name: 'Someone',
    email: 'someone@example.com',
    image: null,
    role: 'member',
    roleName: 'Member',
    audience: 'staff',
    status: 'ACTIVE',
    deactivatedAt: null,
    joinedAt: '2026-10-30T02:15:00.000Z',
    propertyAccess: EVERY_PROPERTY,
    lastActiveAt: null,
    ...overrides,
  };
}

const STAFF: Member[] = [
  member({ id: 'm-owner', userId: 'u-owner', name: 'Olive Reyes', role: 'owner', roleName: 'Owner' }),
  member({
    id: 'm-admin',
    userId: 'u-admin',
    name: 'Ana Cruz',
    role: 'admin',
    roleName: 'Admin',
    lastActiveAt: new Date(Date.now() - 12 * 60_000).toISOString(),
  }),
  member({ id: 'm-member', userId: 'u-member', name: 'Ben Santos', status: 'DEACTIVATED', deactivatedAt: '2026-10-31T01:00:00.000Z' }),
];

const PENDING: Invitation = {
  id: 'i-1',
  email: 'carla@example.com',
  role: 'member',
  roleName: 'Member',
  propertyAccess: BRICKSTONE_ONLY,
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 60_000).toISOString(),
  createdAt: '2026-10-31T01:00:00.000Z',
  invitedBy: { id: 'u-owner', name: 'Olive Reyes' },
};

const EVERY_TEAM_CODE: Permission[] = ['members:view', 'members:invite', 'members:update', 'members:deactivate'];
const LOGIN_CODES: Permission[] = ['members:view', 'residents:manage_access', 'parking_attendants:manage'];

const RESIDENTS: Member[] = [
  member({ id: 'm-t1', userId: 'u-t1', name: 'Tess Tenant', email: 'tess@example.com', role: 'resident', roleName: 'Resident', audience: 'resident' }),
  member({ id: 'm-t2', userId: 'u-t2', name: 'Tom Tenant', email: 'tom@example.com', role: 'resident', roleName: 'Resident', audience: 'resident', status: 'DEACTIVATED' }),
];

const ATTENDANTS: Member[] = [
  member({ id: 'm-a1', userId: 'u-a1', name: 'Basement attendant', email: 'basement@example.com', role: 'parking_attendant', roleName: 'Parking attendant', audience: 'parking', propertyAccess: BRICKSTONE_ONLY }),
  member({ id: 'm-a2', userId: 'u-a2', name: 'Gate attendant', email: 'gate@example.com', role: 'parking_attendant', roleName: 'Parking attendant', audience: 'parking', status: 'DEACTIVATED' }),
];

function page(data: Member[]) {
  return { data, meta: { total: data.length, page: 1, limit: 10, lastPage: 1 } };
}

describe('TeamMembers', () => {
  const members = { list: vi.fn(), deactivate: vi.fn(), reactivate: vi.fn(), transferOwnership: vi.fn() };
  const invitations = { list: vi.fn(), resend: vi.fn(), revoke: vi.fn() };
  const attendants = { disable: vi.fn(), enable: vi.fn() };
  const residentLogins = { findResidentId: vi.fn(), disable: vi.fn(), enable: vi.fn() };
  const confirm = { danger: vi.fn(), proceed: vi.fn() };
  const user = signal({ id: 'u-owner', name: 'Olive Reyes', email: 'olive@example.com', organizationRole: 'owner' });
  const held = signal<Permission[]>(EVERY_TEAM_CODE);
  const auth = {
    currentUser: user,
    activeOrganization: signal({ id: 'org-1', name: 'Brickstone Realty', slug: 'brickstone' }),
    can: (code: Permission) => held().includes(code),
    propertyAccess: signal<PropertyAccess>(EVERY_PROPERTY),
  };
  let fixture: ComponentFixture<TeamMembers>;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(TeamMembers);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    user.set({ id: 'u-owner', name: 'Olive Reyes', email: 'olive@example.com', organizationRole: 'owner' });
    held.set(EVERY_TEAM_CODE);
    auth.propertyAccess.set(EVERY_PROPERTY);
    members.list.mockReturnValue(of({ data: STAFF, meta: { total: 3, page: 1, limit: 10, lastPage: 1 } }));
    invitations.list.mockReturnValue(of([PENDING]));

    await TestBed.configureTestingModule({
      imports: [TeamMembers],
      providers: [
        provideRouter([]),
        MessageService,
        { provide: MembersService, useValue: members },
        { provide: InvitationsService, useValue: invitations },
        { provide: ParkingAttendantsService, useValue: attendants },
        { provide: ResidentLoginsService, useValue: residentLogins },
        { provide: AuthService, useValue: auth },
        { provide: ConfirmService, useValue: confirm },
      ],
    })
      .overrideComponent(TeamMembers, {
        remove: {
          imports: [
            InviteStaffDialog,
            ChangeRoleDialog,
            AttendantFormDialog,
            AttendantPasswordDialog,
            ResidentLoginDialog,
            PropertyAccessDialog,
          ],
        },
        add: {
          imports: [
            InviteStaffDialogStub,
            ChangeRoleDialogStub,
            AttendantFormDialogStub,
            AttendantPasswordDialogStub,
            ResidentLoginDialogStub,
            PropertyAccessDialogStub,
          ],
        },
      })
      .compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    vi.clearAllMocks();
  });

  function rowFor(name: string): HTMLTableRowElement {
    const rows: HTMLTableRowElement[] = [...fixture.nativeElement.querySelectorAll('tbody tr')];
    const row = rows.find((candidate) => candidate.textContent?.includes(name));
    if (!row) throw new Error(`${name} row not rendered`);
    return row;
  }

  function actionsButton(name: string): HTMLButtonElement | null {
    return rowFor(name).querySelector(`button[aria-label="Actions for ${name}"]`);
  }

  function buttonLabelled(label: string): HTMLButtonElement | undefined {
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button')];
    return buttons.find((button) => button.textContent?.trim() === label || button.getAttribute('aria-label') === label);
  }

  it('lists staff first, with their role, property access and status', async () => {
    await render();

    expect(members.list).toHaveBeenCalledWith(expect.objectContaining({ audience: 'staff', page: 1 }));
    const ben = rowFor('Ben Santos').textContent ?? '';
    expect(ben).toContain('Member');
    expect(ben).toContain('All properties');
    expect(ben).toContain('Deactivated');
    expect(rowFor('Olive Reyes').textContent).toContain('You');
  });

  it('shows when each person was last active, and Never for someone who never signed in', async () => {
    await render();

    expect(fixture.nativeElement.querySelector('thead').textContent).toContain('Last active');
    expect(rowFor('Ana Cruz').textContent).toContain('12 min ago');
    expect(rowFor('Ana Cruz').querySelector('[title]')?.getAttribute('title')).toMatch(/\d{1,2}:\d{2} [AP]M$/);
    expect(rowFor('Ben Santos').textContent).toContain('Never');
  });

  it('shows a pending invitation with its role and property limits', async () => {
    await render();

    const invitation = fixture.nativeElement.querySelector('#pending-invitations-heading').closest('section');
    expect(invitation.textContent).toContain('Member');
    expect(invitation.textContent).toContain('1 property');
    expect(invitation.querySelector('[title="Brickstone"]')).toBeTruthy();
  });

  it('opens Property access for a staff member, and swaps the row once it is saved', async () => {
    await render();

    menuItem('Ben Santos', 'Property access').command?.({});
    fixture.detectChanges();
    const dialog = stub(PropertyAccessDialogStub);
    expect(dialog.visible()).toBe(true);
    expect(dialog.member()?.id).toBe('m-member');

    dialog.changed.emit({ ...STAFF[2], propertyAccess: BRICKSTONE_ONLY });
    fixture.detectChanges();

    const cell = rowFor('Ben Santos');
    expect(cell.textContent).toContain('1 property');
    expect(cell.querySelector('[title="Brickstone"]')).toBeTruthy();
  });

  it('keeps Property access from someone limited to fewer properties than the person has', async () => {
    auth.propertyAccess.set(BRICKSTONE_ONLY);
    await render();

    expect(menuOf('Ben Santos').map((item) => item.label)).not.toContain('Property access');
  });

  it('offers the owner actions on everyone but themselves', async () => {
    await render();

    expect(actionsButton('Olive Reyes')).toBeNull();
    expect(actionsButton('Ana Cruz')).not.toBeNull();
    expect(actionsButton('Ben Santos')).not.toBeNull();
  });

  it('hides actions on another admin from an admin', async () => {
    user.set({ id: 'u-admin', name: 'Ana Cruz', email: 'ana@example.com', organizationRole: 'admin' });
    await render();

    expect(actionsButton('Olive Reyes')).toBeNull();
    expect(actionsButton('Ana Cruz')).toBeNull();
    expect(actionsButton('Ben Santos')).not.toBeNull();
  });

  it('shows pending invitations with their expiry, Resend and Revoke', async () => {
    await render();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Pending invitations');
    expect(text).toContain('carla@example.com');
    expect(text).toContain('Expires in 6 days');
    expect(buttonLabelled('Resend the invitation to carla@example.com')).toBeTruthy();
    expect(buttonLabelled('Revoke the invitation to carla@example.com')).toBeTruthy();
    expect(buttonLabelled('Invite staff')).toBeTruthy();
  });

  it('gives a viewer the list without Invite, Resend, Revoke or row actions', async () => {
    held.set(['members:view']);
    user.set({ id: 'u-member', name: 'Ben Santos', email: 'ben@example.com', organizationRole: 'member' });
    await render();

    expect(buttonLabelled('Invite staff')).toBeUndefined();
    expect(buttonLabelled('Resend the invitation to carla@example.com')).toBeUndefined();
    expect(actionsButton('Ana Cruz')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('carla@example.com');
  });

  it('shows only invitations under the Invited status', async () => {
    await render();
    members.list.mockClear();

    fixture.componentInstance.setStatus('INVITED');
    fixture.detectChanges();

    expect(members.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('carla@example.com');
  });

  it('shows placeholder rows while people load', async () => {
    members.list.mockReturnValue(NEVER);
    invitations.list.mockReturnValue(NEVER);
    await render();

    expect(fixture.nativeElement.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
  });

  it("shows the API's reason when people fail to load, and retries", async () => {
    members.list.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: { statusCode: 500, message: 'Database is down.' } })),
    );
    await render();

    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('Database is down.');

    members.list.mockReturnValue(of({ data: STAFF, meta: { total: 3, page: 1, limit: 10, lastPage: 1 } }));
    buttonLabelled('Retry')?.click();
    fixture.detectChanges();

    expect(rowFor('Ana Cruz')).toBeTruthy();
  });

  it('says no one matches a filter, and clears it', async () => {
    await render();
    members.list.mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 10, lastPage: 1 } }));

    fixture.componentInstance.setStatus('DEACTIVATED');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No one matches');
    members.list.mockReturnValue(of({ data: STAFF, meta: { total: 3, page: 1, limit: 10, lastPage: 1 } }));
    buttonLabelled('Clear filters')?.click();
    fixture.detectChanges();

    expect(members.list).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined, q: undefined }));
    expect(rowFor('Ben Santos')).toBeTruthy();
  });

  it('shows an empty state under Invited when nothing is pending', async () => {
    invitations.list.mockReturnValue(of([]));
    await render();

    expect(fixture.nativeElement.textContent).not.toContain('Pending invitations');
    fixture.componentInstance.setStatus('INVITED');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pending invitations');
  });

  it('shows an error with Retry when invitations fail to load', async () => {
    invitations.list.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') })),
    );
    await render();

    expect(fixture.nativeElement.textContent).toContain("Can't reach the server.");
    expect(buttonLabelled('Retry')).toBeTruthy();
  });

  it('lists tenants without staff actions, invitations or the Invite button', async () => {
    await render();

    fixture.componentInstance.setAudience('residents');
    fixture.detectChanges();

    expect(members.list).toHaveBeenLastCalledWith(expect.objectContaining({ audience: 'residents', page: 1 }));
    expect(buttonLabelled('Invite staff')).toBeUndefined();
    expect(fixture.nativeElement.textContent).not.toContain('Pending invitations');
  });

  async function openAudience(audience: 'residents' | 'attendants', rows: Member[]): Promise<void> {
    await render();
    members.list.mockReturnValue(of(page(rows)));
    fixture.componentInstance.setAudience(audience);
    fixture.detectChanges();
  }

  /** The items in a row's actions menu, after pressing its button. */
  function menuOf(name: string): MenuItem[] {
    actionsButton(name)?.click();
    fixture.detectChanges();
    return fixture.componentInstance.overflowItems();
  }

  function menuItem(name: string, label: string): MenuItem {
    const item = menuOf(name).find((candidate) => candidate.label === label);
    if (!item) throw new Error(`${label} is not in the ${name} menu`);
    return item;
  }

  function stub<T>(type: new () => T): T {
    return fixture.debugElement.query(By.directive(type)).componentInstance as T;
  }

  describe('parking attendants', () => {
    beforeEach(() => held.set(LOGIN_CODES));

    it('lists attendants with their access, and offers Add attendant instead of Invite staff', async () => {
      await openAudience('attendants', ATTENDANTS);

      expect(members.list).toHaveBeenLastCalledWith(expect.objectContaining({ audience: 'attendants' }));
      expect(fixture.nativeElement.textContent).toContain('Property access');
      expect(rowFor('Basement attendant').textContent).toContain('1 property');
      expect(rowFor('Gate attendant').textContent).toContain('All properties');
      expect(rowFor('Basement attendant').textContent).toContain('Parking attendant');
      expect(fixture.nativeElement.textContent).toContain('Attendants sign in on the handheld app only.');
      expect(buttonLabelled('Add attendant')).toBeTruthy();
      expect(buttonLabelled('Invite staff')).toBeUndefined();
    });

    it('opens the Add attendant dialog', async () => {
      await openAudience('attendants', ATTENDANTS);

      buttonLabelled('Add attendant')?.click();
      fixture.detectChanges();

      expect(stub(AttendantFormDialogStub).visible()).toBe(true);
    });

    it('shows the list without Add attendant or row actions to someone who cannot manage attendants', async () => {
      held.set(['members:view']);
      await openAudience('attendants', ATTENDANTS);

      expect(rowFor('Basement attendant')).toBeTruthy();
      expect(buttonLabelled('Add attendant')).toBeUndefined();
      expect(actionsButton('Basement attendant')).toBeNull();
    });

    it('offers Reset password and Disable on an active attendant, and only Enable on a disabled one', async () => {
      await openAudience('attendants', ATTENDANTS);

      expect(menuOf('Basement attendant').map((item) => item.label)).toEqual([
        'Property access',
        'Reset password',
        'Disable',
      ]);
      expect(menuOf('Gate attendant').map((item) => item.label)).toEqual(['Property access', 'Enable']);
    });

    it('opens the reset dialog for that attendant', async () => {
      await openAudience('attendants', ATTENDANTS);

      menuItem('Basement attendant', 'Reset password').command?.({});
      fixture.detectChanges();

      const dialog = stub(AttendantPasswordDialogStub);
      expect(dialog.visible()).toBe(true);
      expect(dialog.member()?.userId).toBe('u-a1');
    });

    it('asks before it disables, then turns the login off by the attendant user id', async () => {
      const response: ParkingAttendantResponse = {
        id: 'u-a1',
        name: 'Basement attendant',
        email: 'basement@example.com',
        status: 'DISABLED',
        createdAt: '2026-10-01T00:00:00.000Z',
        propertyAccess: BRICKSTONE_ONLY,
      };
      attendants.disable.mockReturnValue(of(response));
      await openAudience('attendants', ATTENDANTS);

      menuItem('Basement attendant', 'Disable').command?.({});
      expect(confirm.danger).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Disable attendant', acceptLabel: 'Disable' }),
      );
      expect(attendants.disable).not.toHaveBeenCalled();

      confirm.danger.mock.calls[0][0].onAccept();
      fixture.detectChanges();

      expect(attendants.disable).toHaveBeenCalledWith('u-a1');
      expect(rowFor('Basement attendant').textContent).toContain('Login off');
    });

    it('turns a disabled attendant back on without asking', async () => {
      attendants.enable.mockReturnValue(of({ id: 'u-a2', status: 'ACTIVE' } as ParkingAttendantResponse));
      await openAudience('attendants', ATTENDANTS);

      menuItem('Gate attendant', 'Enable').command?.({});
      fixture.detectChanges();

      expect(confirm.danger).not.toHaveBeenCalled();
      expect(attendants.enable).toHaveBeenCalledWith('u-a2');
      expect(rowFor('Gate attendant').textContent).not.toContain('Login off');
    });

    it('reloads the list from the first page once an attendant is added', async () => {
      await openAudience('attendants', ATTENDANTS);
      members.list.mockClear();

      stub(AttendantFormDialogStub).created.emit({
        id: 'u-a3',
        name: 'Roof attendant',
        email: 'roof@example.com',
        status: 'ACTIVE',
        createdAt: '2026-10-31T00:00:00.000Z',
        propertyAccess: EVERY_PROPERTY,
      });
      fixture.detectChanges();

      expect(members.list).toHaveBeenCalledWith(expect.objectContaining({ audience: 'attendants', page: 1 }));
    });
  });

  describe('tenant logins', () => {
    const OFF = { residentId: 't-1', status: 'DISABLED', email: 'tess@example.com', mustChangePassword: false };

    beforeEach(() => {
      held.set(LOGIN_CODES);
      residentLogins.findResidentId.mockReturnValue(of('t-1'));
    });

    it('lists tenants without a property column, and offers Add tenant login', async () => {
      await openAudience('residents', RESIDENTS);

      expect(rowFor('Tess Tenant').textContent).toContain('tess@example.com');
      expect(fixture.nativeElement.textContent).not.toContain('Property access');
      expect(fixture.nativeElement.textContent).toContain("leaves the tenant's lease and billing as they are");
      expect(buttonLabelled('Add tenant login')).toBeTruthy();
      expect(buttonLabelled('Invite staff')).toBeUndefined();
    });

    it('opens the dialog to set a login up, and to reset one', async () => {
      await openAudience('residents', RESIDENTS);

      buttonLabelled('Add tenant login')?.click();
      fixture.detectChanges();
      expect(stub(ResidentLoginDialogStub).visible()).toBe(true);
      expect(stub(ResidentLoginDialogStub).member()).toBeNull();

      menuItem('Tess Tenant', 'Reset password').command?.({});
      fixture.detectChanges();
      expect(stub(ResidentLoginDialogStub).member()?.userId).toBe('u-t1');
    });

    it('offers Reset password and Disable login on an active login, and only Enable login on one that is off', async () => {
      await openAudience('residents', RESIDENTS);

      expect(menuOf('Tess Tenant').map((item) => item.label)).toEqual(['Reset password', 'Disable login']);
      expect(menuOf('Tom Tenant').map((item) => item.label)).toEqual(['Enable login']);
    });

    it('shows the list without Add tenant login or row actions to someone who cannot manage tenant logins', async () => {
      held.set(['members:view']);
      await openAudience('residents', RESIDENTS);

      expect(rowFor('Tess Tenant')).toBeTruthy();
      expect(buttonLabelled('Add tenant login')).toBeUndefined();
      expect(actionsButton('Tess Tenant')).toBeNull();
    });

    it('says the lease and billing stay put before it disables a login, then turns it off', async () => {
      residentLogins.disable.mockReturnValue(of(OFF));
      await openAudience('residents', RESIDENTS);

      menuItem('Tess Tenant', 'Disable login').command?.({});
      const options = confirm.danger.mock.calls[0][0];
      expect(options.header).toBe("Disable Tess Tenant's login?");
      expect(options.message).toContain('Their lease and billing stay as they are.');
      expect(residentLogins.disable).not.toHaveBeenCalled();

      options.onAccept();
      fixture.detectChanges();

      expect(residentLogins.findResidentId).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u-t1' }));
      expect(residentLogins.disable).toHaveBeenCalledWith('t-1');
      expect(rowFor('Tess Tenant').textContent).toContain('Login off');
    });

    it('turns a login back on without asking', async () => {
      residentLogins.enable.mockReturnValue(of({ ...OFF, status: 'ACTIVE' }));
      await openAudience('residents', RESIDENTS);

      menuItem('Tom Tenant', 'Enable login').command?.({});
      fixture.detectChanges();

      expect(confirm.danger).not.toHaveBeenCalled();
      expect(residentLogins.enable).toHaveBeenCalledWith('t-1');
      expect(rowFor('Tom Tenant').textContent).not.toContain('Login off');
    });

    it('leaves the login alone and says why when it cannot be tied to one tenant', async () => {
      residentLogins.findResidentId.mockReturnValue(throwError(() => new ResidentLoginLookupError('No single match.')));
      await openAudience('residents', RESIDENTS);
      const add = vi.spyOn(TestBed.inject(MessageService), 'add');

      menuItem('Tess Tenant', 'Disable login').command?.({});
      confirm.danger.mock.calls[0][0].onAccept();
      fixture.detectChanges();

      expect(residentLogins.disable).not.toHaveBeenCalled();
      expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', detail: 'No single match.' }));
      expect(rowFor('Tess Tenant').textContent).not.toContain('Login off');
    });

    it('reloads the list from the first page once a login is set up', async () => {
      await openAudience('residents', RESIDENTS);
      members.list.mockClear();

      stub(ResidentLoginDialogStub).finished.emit({ kind: 'setup', email: 'new@example.com' });
      fixture.detectChanges();

      expect(members.list).toHaveBeenCalledWith(expect.objectContaining({ audience: 'residents', page: 1 }));
    });
  });

  describe('the filter in the URL', () => {
    function openAt(audience: string | null): Promise<void> {
      const params = convertToParamMap(audience ? { audience } : {});
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: { snapshot: { queryParamMap: params }, queryParamMap: of(params) },
      });
      return render();
    }

    it('lands on Attendants for ?audience=attendants, as the old attendants address does', async () => {
      await openAt('attendants');

      expect(fixture.componentInstance.audience()).toBe('attendants');
      expect(members.list).toHaveBeenCalledWith(expect.objectContaining({ audience: 'attendants' }));
      expect(members.list).not.toHaveBeenCalledWith(expect.objectContaining({ audience: 'staff' }));
    });

    it('lands on Tenants for ?audience=tenants', async () => {
      await openAt('residents');

      expect(fixture.componentInstance.audience()).toBe('residents');
    });

    it('lands on Staff for anything else', async () => {
      await openAt('everyone');

      expect(fixture.componentInstance.audience()).toBe('staff');
    });

    it('writes the filter to the URL when it changes, and clears it for Staff', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await render();

      fixture.componentInstance.setAudience('attendants');
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { audience: 'attendants' }, queryParamsHandling: 'merge', replaceUrl: true }),
      );

      fixture.componentInstance.setAudience('staff');
      expect(navigate).toHaveBeenLastCalledWith([], expect.objectContaining({ queryParams: { audience: null } }));
    });
  });
});
