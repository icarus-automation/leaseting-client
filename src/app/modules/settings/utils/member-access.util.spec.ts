import type { Permission } from '../../../core/auth/permissions';
import type { Member } from '../../../core/models/member.types';
import { EVERY_PROPERTY, type PropertyAccess } from '../../../core/models/property-access.types';
import type { Role } from '../../../core/models/role.types';
import {
  assignableRoles,
  initialsOf,
  invitationExpiry,
  lastActiveLabel,
  memberActions,
  memberStatusBadge,
  propertyAccessLabel,
  type MemberActor,
} from './member-access.util';

const ALL_TEAM_CODES: Permission[] = ['members:view', 'members:invite', 'members:update', 'members:deactivate'];

function actor(role: string, codes: readonly string[] = ALL_TEAM_CODES, propertyAccess = EVERY_PROPERTY): MemberActor {
  return { userId: 'me', role, can: (code) => codes.includes(code), propertyAccess };
}

function limitedTo(...names: string[]): PropertyAccess {
  const properties = names.map((name) => ({ id: `p-${name}`, name, isArchived: false }));
  return { isLimited: true, propertyIds: properties.map((property) => property.id), properties };
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
    propertyAccess: EVERY_PROPERTY,
    lastActiveAt: null,
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
  it('lets an admin change, limit to properties and deactivate, but not transfer, for a member', () => {
    expect(memberActions(actor('admin'), member())).toEqual(['change-role', 'property-access', 'deactivate']);
  });

  it('gives the owner transfer ownership on an active member', () => {
    expect(memberActions(actor('owner'), member())).toEqual([
      'change-role',
      'property-access',
      'transfer-ownership',
      'deactivate',
    ]);
  });

  it('offers reactivate instead of deactivate, and no transfer, for a deactivated member', () => {
    expect(memberActions(actor('owner'), member({ status: 'DEACTIVATED' }))).toEqual([
      'change-role',
      'property-access',
      'reactivate',
    ]);
  });

  it('hides every action on another admin unless the actor is the owner', () => {
    const otherAdmin = member({ role: 'admin', roleName: 'Admin' });

    expect(memberActions(actor('admin'), otherAdmin)).toEqual([]);
    expect(memberActions(actor('owner'), otherAdmin)).toEqual([
      'change-role',
      'property-access',
      'transfer-ownership',
      'deactivate',
    ]);
  });

  it('never offers transfer ownership or property limits on another owner', () => {
    expect(memberActions(actor('owner'), member({ role: 'owner' }))).toEqual(['change-role', 'deactivate']);
  });

  describe('property access', () => {
    it('lets a limited admin change someone within their own properties only', () => {
      const admin = actor('admin', ALL_TEAM_CODES, limitedTo('Brickstone', 'Harbor'));

      expect(memberActions(admin, member({ propertyAccess: limitedTo('Brickstone') }))).toContain('property-access');
      expect(memberActions(admin, member({ propertyAccess: limitedTo('Sunrise') }))).not.toContain('property-access');
      // Every property is beyond anyone limited.
      expect(memberActions(admin, member())).not.toContain('property-access');
    });

    it('needs the role change code for staff', () => {
      expect(memberActions(actor('admin', ['members:view', 'members:deactivate']), member())).toEqual(['deactivate']);
    });
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

    it('lets the right code limit an attendant to properties, reset a password, or turn the login off', () => {
      expect(memberActions(actor('admin', loginCodes), attendant)).toEqual([
        'property-access',
        'reset-password',
        'disable-login',
      ]);
    });

    it('offers only enable on a login that is off, since a reset would not turn it back on', () => {
      expect(memberActions(actor('admin', loginCodes), { ...tenant, status: 'DEACTIVATED' })).toEqual([
        'enable-login',
      ]);
      expect(memberActions(actor('admin', loginCodes), { ...attendant, status: 'DEACTIVATED' })).toEqual([
        'property-access',
        'enable-login',
      ]);
    });

    it('keeps each code to its own audience', () => {
      const tenantsOnly = actor('member', ['members:view', 'tenants:manage_access']);
      const attendantsOnly = actor('member', ['members:view', 'parking_attendants:manage']);

      expect(memberActions(tenantsOnly, attendant)).toEqual([]);
      expect(memberActions(attendantsOnly, tenant)).toEqual([]);
      expect(memberActions(tenantsOnly, tenant)).toEqual(['reset-password', 'disable-login']);
      expect(memberActions(attendantsOnly, attendant)).toEqual(['property-access', 'reset-password', 'disable-login']);
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

    expect(memberActions(customRole, member())).toEqual(['change-role', 'property-access']);
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
  it('reads someone without limits as all properties, and gives a tenant no label', () => {
    expect(propertyAccessLabel(member({ role: 'owner' }))).toEqual({ label: 'All properties', names: null });
    expect(propertyAccessLabel(member())).toEqual({ label: 'All properties', names: null });
    expect(propertyAccessLabel(member({ role: 'tenant', audience: 'tenant' }))).toBeNull();
  });

  it('counts a limited person or attendant, naming the properties for the tooltip', () => {
    expect(propertyAccessLabel(member({ propertyAccess: limitedTo('Brickstone') }))).toEqual({
      label: '1 property',
      names: 'Brickstone',
    });
    expect(
      propertyAccessLabel(
        member({ role: 'parking_attendant', audience: 'parking', propertyAccess: limitedTo('Brickstone', 'Harbor') }),
      ),
    ).toEqual({ label: '2 properties', names: 'Brickstone, Harbor' });
  });

  it('counts properties the viewer can not see without naming them', () => {
    const access: PropertyAccess = { ...limitedTo('Brickstone'), propertyIds: ['p-Brickstone', 'p-hidden'] };

    expect(propertyAccessLabel(member({ propertyAccess: access }))).toEqual({
      label: '2 properties',
      names: "Brickstone, 1 more you can't see",
    });
  });

  it('reads last active as relative time, with the exact time for the tooltip', () => {
    const now = new Date(2026, 9, 31, 12, 0);

    expect(lastActiveLabel(null, now)).toEqual({ label: 'Never', exact: null });
    expect(lastActiveLabel(new Date(2026, 9, 31, 11, 59, 40).toISOString(), now).label).toBe('Just now');
    expect(lastActiveLabel(new Date(2026, 9, 31, 11, 48).toISOString(), now).label).toBe('12 min ago');
    expect(lastActiveLabel(new Date(2026, 9, 31, 9, 0).toISOString(), now).label).toBe('3 hours ago');
    expect(lastActiveLabel(new Date(2026, 9, 30, 8, 0).toISOString(), now).label).toBe('Yesterday');
    expect(lastActiveLabel(new Date(2026, 9, 27, 8, 0).toISOString(), now).label).toBe('4 days ago');
    expect(lastActiveLabel(new Date(2026, 8, 3, 8, 0).toISOString(), now).label).toBe('Sep 3');
    expect(lastActiveLabel(new Date(2026, 9, 31, 9, 5).toISOString(), now).exact).toBe('Oct 31, 2026, 9:05 AM');
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
