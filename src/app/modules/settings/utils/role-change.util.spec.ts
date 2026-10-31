import type { AccessCatalog } from '../../../core/models/access-catalog.types';
import { permissionChanges } from './role-change.util';

const catalog: AccessCatalog = {
  groups: [
    {
      id: 'payments',
      label: 'Payments',
      permissions: [
        { code: 'payments:view', label: 'View payments', description: '', scopable: true, grantable: true },
        { code: 'payments:record', label: 'Record payments', description: '', scopable: true, grantable: true },
        { code: 'payments:void', label: 'Void payments', description: '', scopable: true, grantable: true },
      ],
    },
    {
      id: 'team',
      label: 'Team and roles',
      permissions: [
        { code: 'members:view', label: 'View team', description: '', scopable: false, grantable: true },
        { code: 'members:invite', label: 'Invite people', description: '', scopable: false, grantable: false },
      ],
    },
  ],
  roles: [],
};

describe('permissionChanges', () => {
  it('lists what a downgrade takes away, by label and in catalog order', () => {
    const admin = ['payments:view', 'payments:record', 'payments:void', 'members:view', 'members:invite'];
    const member = ['payments:view', 'members:view'];

    expect(permissionChanges(admin, member, catalog)).toEqual({
      gained: [],
      lost: ['Record payments', 'Void payments', 'Invite people'],
    });
  });

  it('lists what an upgrade adds', () => {
    expect(permissionChanges(['payments:view'], ['members:invite', 'payments:void', 'payments:view'], catalog)).toEqual({
      gained: ['Void payments', 'Invite people'],
      lost: [],
    });
  });

  it('shows the code itself when the catalog does not name it', () => {
    expect(permissionChanges([], ['payments:refund'], null)).toEqual({ gained: ['payments:refund'], lost: [] });
  });
});
