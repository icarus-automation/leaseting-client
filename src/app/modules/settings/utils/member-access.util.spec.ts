import type { Permission } from '../../../core/auth/permissions';
import type { Member } from '../../../core/models/member.types';
import type { Role } from '../../../core/models/role.types';
import {
  assignableRoles,
  initialsOf,
  invitationExpiry,
  memberActions,
  memberStatusBadge,
  propertyAccessLabel,
  type MemberActor,
} from './member-access.util';

const ALL_TEAM_CODES: Permission[] = ['members:view', 'members:invite', 'members:update', 'members:deactivate'];

function actor(role: string, codes: readonly string[] = ALL_TEAM_CODES): MemberActor {
  return { userId: 'me', role, can: (code) => codes.includes(code) };
}

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm-1',
    userId: 'u-1',
    name: 'Ana Cruz',
    email: 'ana@example.com',
    image: null,
    role: 'member',
    roleName: 'Member',
    audience: 'staff',
    status: 'ACTIVE',
    deactivatedAt: null,
    joinedAt: '2026-10-30T02:15:00.000Z',
    ...overrides,
  };
}

function role(overrides: Partial<Role> = {}): Role {
  return {
    id: 'member',
    name: 'Member',
    description: null,
    kind: 'system',
    isLocked: true,
    isActive: true,
    isAssignable: true,
    audience: 'staff',
    permissions: ['members:view'],
    memberCount: 1,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('memberActions', () => {
  it('lets an admin change, deactivate, but not transfer for a member', () => {
    expect(memberActions(actor('admin'), member())).toEqual(['change-role', 'deactivate']);
  });

  it('gives the owner transfer ownership on an active member', () => {
    expect(memberActions(actor('owner'), member())).toEqual(['change-role', 'transfer-ownership', 'deactivate']);
  });

  it('offers reactivate instead of deactivate, and no transfer, for a deactivated member', () => {
    expect(memberActions(actor('owner'), member({ status: 'DEACTIVATED' }))).toEqual(['change-role', 'reactivate']);
  });

  it('hides every action on another admin unless the actor is the owner', () => {
    const otherAdmin = member({ role: 'admin', roleName: 'Admin' });

    expect(memberActions(actor('admin'), otherAdmin)).toEqual([]);
    expect(memberActions(actor('owner'), otherAdmin)).toEqual(['change-role', 'transfer-ownership', 'deactivate']);
  });

  it('never offers transfer ownership on another owner', () => {
    expect(memberActions(actor('owner'), member({ role: 'owner' }))).toEqual(['change-role', 'deactivate']);
  });

  it('offers nothing on the actor themselves', () => {
    expect(memberActions(actor('owner'), member({ userId: 'me' }))).toEqual([]);
  });

  it('offers nothing on tenants and parking attendants to a team manager without their login codes', () => {
    expect(memberActions(actor('owner'), member({ role: 'tenant', audience: 'tenant' }))).toEqual([]);
    expect(memberActions(actor('owner'), member({ role: 'parking_attendant', audience: 'parking' }))).toEqual([]);
  });

  describe('logins', () => {
    const tenant = member({ role: 'tenant', roleName: 'Tenant', audience: 'tenant' });
    const attendant = member({ role: 'parking_attendant', roleName: 'Parking attendant', audience: 'parking' });
    const loginCodes = ['members:view', 'tenants:manage_access', 'parking_attendants:manage'];

    it('lets the right code reset a password or turn a tenant login off', () => {
      expect(memberActions(actor('admin', loginCodes), tenant)).toEqual(['reset-password', 'disable-login']);
    });

    it('lets the right code reset a password or turn an attendant login off', () => {
      expect(memberActions(actor('admin', loginCodes), attendant)).toEqual(['reset-password', 'disable-login']);
    });

    it('offers only enable on a login that is off, since a reset would not turn it back on', () => {
      expect(memberActions(actor('admin', loginCodes), { ...tenant, status: 'DEACTIVATED' })).toEqual([
        'enable-login',
      ]);
      expect(memberActions(actor('admin', loginCodes), { ...attendant, status: 'DEACTIVATED' })).toEqual([
        'enable-login',
      ]);
    });

    it('keeps each code to its own audience', () => {
      const tenantsOnly = actor('member', ['members:view', 'tenants:manage_access']);
      const attendantsOnly = actor('member', ['members:view', 'parking_attendants:manage']);

      expect(memberActions(tenantsOnly, attendant)).toEqual([]);
      expect(memberActions(attendantsOnly, tenant)).toEqual([]);
      expect(memberActions(tenantsOnly, tenant)).toEqual(['reset-password', 'disable-login']);
      expect(memberActions(attendantsOnly, attendant)).toEqual(['reset-password', 'disable-login']);
    });

    it('gives a viewer nothing on either', () => {
      const viewer = actor('member', ['members:view']);

      expect(memberActions(viewer, tenant)).toEqual([]);
      expect(memberActions(viewer, attendant)).toEqual([]);
    });
  });

  it('follows the codes: a viewer gets no actions', () => {
    expect(memberActions(actor('member', ['members:view']), member({ userId: 'u-2' }))).toEqual([]);
  });

  it('lets a custom role holder with members:update act on members only', () => {
    const customRole = actor('6f1c2a9e-4b7d-4c1e-9a3f-2d8b5e7c1a40', ['members:view', 'members:update']);

    expect(memberActions(customRole, member())).toEqual(['change-role']);
    expect(memberActions(customRole, member({ role: 'admin' }))).toEqual([]);
  });
});

describe('assignableRoles', () => {
  const roles = [
    role({ id: 'owner', name: 'Owner', isAssignable: false }),
    role({ id: 'admin', name: 'Admin' }),
    role({ id: 'member', name: 'Member' }),
    role({ id: 'tenant', name: 'Tenant', isAssignable: false, audience: 'tenant' }),
    role({ id: 'custom-on', name: 'Leasing agent', kind: 'custom', isLocked: false }),
    role({ id: 'custom-off', name: 'Old role', kind: 'custom', isLocked: false, isActive: false, isAssignable: false }),
    role({ id: 'custom-big', name: 'Cashier', kind: 'custom', isLocked: false, permissions: ['payments:void'] }),
  ];

  it('keeps assignable staff roles other than the current one', () => {
    const ids = assignableRoles(roles, member({ role: 'member' }), actor('admin')).map((option) => option.id);

    expect(ids).toEqual(['admin', 'custom-on']);
  });

  it('drops roles with a code the actor does not hold', () => {
    const ids = assignableRoles(roles, member(), actor('owner', [...ALL_TEAM_CODES, 'payments:void'])).map(
      (option) => option.id,
    );

    expect(ids).toContain('custom-big');
  });
});

describe('invitationExpiry', () => {
  const now = new Date('2026-10-31T09:00:00');

  it('counts the days left on a pending invitation', () => {
    expect(invitationExpiry({ expiresAt: '2026-11-06T09:00:00', status: 'PENDING' }, now)).toEqual({
      label: 'Expires in 6 days',
      tone: 'neutral',
      isExpired: false,
    });
  });

  it('warns on the last day', () => {
    expect(invitationExpiry({ expiresAt: '2026-10-31T18:00:00', status: 'PENDING' }, now).label).toBe(
      'Expires today',
    );
  });

  it('says how long ago an expired invitation lapsed', () => {
    expect(invitationExpiry({ expiresAt: '2026-10-29T09:00:00', status: 'EXPIRED' }, now)).toEqual({
      label: 'Expired 2 days ago',
      tone: 'destructive',
      isExpired: true,
    });
  });
});

describe('member labels', () => {
  it('reads every staff role as all properties while the API has no property limits', () => {
    expect(propertyAccessLabel(member({ role: 'owner' }))).toBe('All properties');
    expect(propertyAccessLabel(member())).toBe('All properties');
    expect(propertyAccessLabel(member({ role: 'tenant', audience: 'tenant' }))).toBeNull();
  });

  it('reads a parking attendant as all properties for now', () => {
    expect(propertyAccessLabel(member({ role: 'parking_attendant', audience: 'parking' }))).toBe('All properties');
  });

  it('says a tenant login is off rather than deactivated', () => {
    expect(memberStatusBadge(member({ status: 'DEACTIVATED' })).label).toBe('Deactivated');
    expect(memberStatusBadge(member({ status: 'DEACTIVATED', audience: 'tenant' })).label).toBe('Login off');
  });

  it('takes the first and last initials', () => {
    expect(initialsOf('Ana Maria Cruz')).toBe('AC');
    expect(initialsOf('ana')).toBe('A');
    expect(initialsOf('  ')).toBe('·');
  });
});
