import type { Permission } from '../../../core/auth/permissions';
import type { Role } from '../../../core/models/role.types';
import { invitableRoleGroups } from './invite-roles.util';

function role(overrides: Partial<Role> = {}): Role {
  return {
    id: 'member',
    name: 'Member',
    description: 'Day-to-day work.',
    kind: 'system',
    isLocked: true,
    isActive: true,
    isAssignable: true,
    audience: 'staff',
    permissions: ['properties:view'],
    memberCount: 0,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const ROLES: Role[] = [
  role({ id: 'owner', name: 'Owner', isAssignable: false, permissions: ['properties:view', 'members:invite'] }),
  role({ id: 'admin', name: 'Admin', description: 'Every permission.', permissions: ['properties:view', 'members:invite'] }),
  role(),
  role({ id: 'resident', name: 'Resident', audience: 'resident', isAssignable: false, permissions: [] }),
  role({ id: 'parking_attendant', name: 'Parking attendant', audience: 'parking', isAssignable: false, permissions: [] }),
  role({ id: 'r-agent', name: 'Leasing agent', description: null, kind: 'custom', isLocked: false, permissions: ['properties:view', 'leases:view'] }),
  role({ id: 'r-auditor', name: 'Auditor', description: 'Reads the audit log.', kind: 'custom', isLocked: false, permissions: ['audit_log:view'] }),
  role({ id: 'r-off', name: 'Retired role', kind: 'custom', isLocked: false, isActive: false, isAssignable: false }),
  role({ id: 'r-empty', name: 'Blank', description: null, kind: 'custom', isLocked: false, permissions: [] }),
];

const everyCode = (): boolean => true;

describe('invitableRoleGroups', () => {
  it('lists Member before Admin, then the custom roles that are turned on', () => {
    const groups = invitableRoleGroups(ROLES, everyCode);

    expect(groups.map((group) => group.label)).toEqual(['System roles', 'Custom roles']);
    expect(groups[0].items.map((item) => item.value)).toEqual(['member', 'admin']);
    expect(groups[1].items.map((item) => item.label)).toEqual(['Leasing agent', 'Auditor', 'Blank']);
  });

  it('never offers Owner, Tenant, Parking attendant, or a role that is off', () => {
    const values = invitableRoleGroups(ROLES, everyCode).flatMap((group) => group.items.map((item) => item.value));

    expect(values).not.toContain('owner');
    expect(values).not.toContain('resident');
    expect(values).not.toContain('parking_attendant');
    expect(values).not.toContain('r-off');
  });

  it('describes a custom role without a description by what it grants', () => {
    const custom = invitableRoleGroups(ROLES, everyCode)[1].items;

    expect(custom.find((item) => item.value === 'r-agent')?.description).toBe('2 permissions.');
    expect(custom.find((item) => item.value === 'r-empty')?.description).toBe('Grants nothing yet.');
  });

  it('leaves out a role holding a code the inviter lacks, since the API refuses it', () => {
    const held: string[] = ['properties:view', 'leases:view'];
    const groups = invitableRoleGroups(ROLES, (code: Permission) => held.includes(code));

    expect(groups[0].items.map((item) => item.value)).toEqual(['member']);
    expect(groups[1].items.map((item) => item.value)).toEqual(['r-agent', 'r-empty']);
  });

  it('falls back to Member and Admin, with no custom group, before the roles load', () => {
    const groups = invitableRoleGroups([], everyCode);

    expect(groups).toHaveLength(1);
    expect(groups[0].items.map((item) => item.value)).toEqual(['member', 'admin']);
  });
});
