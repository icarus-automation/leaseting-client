import type { SessionUser } from '../../../core/auth/auth.types';
import type { AccessCatalog } from '../../../core/models/access-catalog.types';
import type { Role } from '../../../core/models/role.types';
import {
  ACTIVITY_FILTERS,
  KIND_FILTERS,
  ROLE_NOT_COPYABLE_MESSAGE,
  USERS_SETTINGS_HREF,
  filterRoles,
  heldCodes,
  indexCatalog,
  openDraft,
  presentRole,
  projectPicker,
  toggleGroup,
  togglePermission,
  writePayload,
} from './role-access.util';

const CATALOG: AccessCatalog = {
  groups: [
    {
      id: 'payments',
      label: 'Payments',
      permissions: [
        {
          code: 'payments:view',
          label: 'View payments',
          description: 'See payments and proof.',
          scopable: true,
          grantable: true,
        },
        {
          code: 'payments:void',
          label: 'Void payments',
          description: 'Reverse a confirmed payment.',
          scopable: true,
          grantable: true,
        },
      ],
    },
    {
      id: 'team',
      label: 'Team and roles',
      permissions: [
        {
          code: 'roles:manage',
          label: 'Manage roles',
          description: 'Create and change roles.',
          scopable: false,
          grantable: false,
        },
        {
          code: 'members:invite',
          label: 'Invite staff',
          description: 'Send invitation links.',
          scopable: false,
          grantable: false,
        },
        {
          code: 'members:view',
          label: 'View people',
          description: 'See who is on the team.',
          scopable: false,
          grantable: true,
        },
      ],
    },
  ],
  roles: [],
};

const INDEX = indexCatalog(CATALOG);
const EVERY_CODE = new Set([
  'payments:view',
  'payments:void',
  'roles:manage',
  'members:invite',
  'members:view',
]);
const LIMITED = new Set(['payments:view', 'members:view']);

function role(overrides: Partial<Role> = {}): Role {
  return {
    id: 'member',
    name: 'Member',
    description: 'Day-to-day staff.',
    kind: 'system',
    isLocked: true,
    isActive: true,
    isAssignable: true,
    audience: 'staff',
    permissions: ['payments:view', 'members:view'],
    memberCount: 2,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function user(permissions: readonly string[] | undefined): SessionUser {
  return { id: 'u-1', name: 'Olive', email: 'olive@example.com', permissions };
}

describe('heldCodes', () => {
  it('reads the session codes and treats a missing list as none', () => {
    expect([...heldCodes(user(['payments:view', 'roles:manage']))]).toEqual([
      'payments:view',
      'roles:manage',
    ]);
    expect(heldCodes(user(undefined)).size).toBe(0);
    expect(heldCodes(null).size).toBe(0);
  });
});

describe('indexCatalog', () => {
  it('looks up a permission by code and keeps catalog order', () => {
    expect(INDEX.byCode.get('members:view')?.label).toBe('View people');
    expect([...INDEX.byCode.keys()]).toEqual([
      'payments:view',
      'payments:void',
      'roles:manage',
      'members:invite',
      'members:view',
    ]);
  });
});

describe('filterRoles', () => {
  const owner = role({ id: 'owner', name: 'Owner', description: 'Owns the organization.' });
  const resident = role({
    id: 'resident',
    name: 'Resident',
    description: 'Residence Care only.',
    audience: 'resident',
    permissions: [],
  });
  const agent = role({
    id: 'r-agent',
    name: 'Leasing agent',
    description: 'Front desk.',
    kind: 'custom',
    isLocked: false,
    isAssignable: true,
    permissions: ['payments:view'],
    memberCount: 3,
  });
  const archived = role({
    id: 'r-old',
    name: 'Night clerk',
    description: 'After hours.',
    kind: 'custom',
    isLocked: false,
    isActive: false,
    isAssignable: false,
    permissions: [],
    memberCount: 0,
  });
  const rows = [owner, resident, agent, archived];

  it('lists the kind and activity chips', () => {
    expect(KIND_FILTERS.map((option) => option.value)).toEqual(['all', 'system', 'custom']);
    expect(ACTIVITY_FILTERS.map((option) => option.value)).toEqual(['all', 'active', 'inactive']);
  });

  it('keeps system roles off the inactive filter', () => {
    expect(
      filterRoles(rows, { kind: 'all', activity: 'inactive', search: '' }).map((row) => row.id),
    ).toEqual(['r-old']);
  });

  it('narrows by kind, activity, and search on name or description', () => {
    expect(
      filterRoles(rows, { kind: 'custom', activity: 'all', search: '' }).map((row) => row.id),
    ).toEqual(['r-agent', 'r-old']);
    expect(
      filterRoles(rows, { kind: 'all', activity: 'active', search: 'desk' }).map((row) => row.id),
    ).toEqual(['r-agent']);
    expect(
      filterRoles(rows, { kind: 'system', activity: 'all', search: 'owner' }).map((row) => row.id),
    ).toEqual(['owner']);
  });
});

describe('presentRole', () => {
  const custom = (overrides: Partial<Role> = {}) =>
    role({ kind: 'custom', isLocked: false, id: 'r-1', memberCount: 0, ...overrides });

  it('labels every system role just System, and a custom role Custom', () => {
    const resident = presentRole(
      role({ id: 'resident', name: 'Resident', audience: 'resident', memberCount: 4 }),
      true,
    );
    expect(resident.typeLabel).toBe('System');
    expect(presentRole(role(), true).typeLabel).toBe('System');
    expect(presentRole(custom(), true).typeLabel).toBe('Custom');
  });

  describe('menu', () => {
    it('gives a custom role Edit, Duplicate, Turn off/on, then Delete last', () => {
      expect(presentRole(custom(), true).menu).toEqual(['edit', 'duplicate', 'toggle-active', 'delete']);
    });

    it('gives Owner, Admin and Member View and Duplicate', () => {
      for (const id of ['owner', 'admin', 'member']) {
        expect(presentRole(role({ id }), true).menu).toEqual(['view', 'duplicate']);
      }
    });

    it('gives Tenant and Parking attendant View only, since their roles cannot be copied', () => {
      expect(presentRole(role({ id: 'resident', audience: 'resident' }), true).menu).toEqual(['view']);
      expect(presentRole(role({ id: 'parking_attendant', audience: 'parking' }), true).menu).toEqual(['view']);
    });

    it('gives someone who cannot manage roles View on every role', () => {
      expect(presentRole(role(), false).menu).toEqual(['view']);
      expect(presentRole(custom(), false).menu).toEqual(['view']);
    });
  });

  it('refuses delete with the holder count and the Users path', () => {
    expect(presentRole(role({ memberCount: 3 }), true).deleteRefusal).toEqual({
      message: '3 people have this role. Give them another role before deleting it.',
      usersHref: USERS_SETTINGS_HREF,
    });
    expect(presentRole(role({ memberCount: 1 }), true).deleteRefusal?.message).toBe(
      '1 person has this role. Give them another role before deleting it.',
    );
    expect(presentRole(role({ memberCount: 0 }), true).deleteRefusal).toBeNull();
  });

  it('names the people column from memberCount', () => {
    expect(presentRole(role({ memberCount: 0 }), true).peopleLabel).toBe('0 people');
    expect(presentRole(role({ memberCount: 1 }), true).peopleLabel).toBe('1 person');
  });
});

describe('openDraft', () => {
  it('opens a blank create draft', () => {
    const opened = openDraft({ kind: 'new' }, INDEX, true);
    expect(opened).toEqual({
      ok: true,
      draft: {
        intent: 'create',
        seed: { name: '', description: '', pick: { selected: new Set(), unknown: [] } },
      },
    });
  });

  it('copies a staff role as a create draft named Copy of <name>', () => {
    const opened = openDraft(
      {
        kind: 'copy',
        role: role({
          kind: 'custom',
          isLocked: false,
          name: 'Leasing agent',
          description: 'Front desk.',
          permissions: ['payments:view', 'roles:manage', 'ghost:code'],
        }),
      },
      INDEX,
      true,
    );

    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.draft.intent).toBe('create');
    expect(opened.draft.seed.name).toBe('Copy of Leasing agent');
    expect(opened.draft.seed.description).toBe('Front desk.');
    expect([...opened.draft.seed.pick.selected]).toEqual(['payments:view']);
    expect(opened.draft.seed.pick.unknown).toEqual(['ghost:code']);
  });

  it('clears a system description, drops grantable:false codes, and truncates the copy name to 50', () => {
    const longName = 'Front desk lead for weekday and weekend coverage';
    const opened = openDraft(
      {
        kind: 'copy',
        role: role({
          name: longName,
          description: 'Every permission.',
          permissions: ['payments:view', 'roles:manage'],
        }),
      },
      INDEX,
      true,
    );

    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.draft.seed.description).toBe('');
    expect([...opened.draft.seed.pick.selected]).toEqual(['payments:view']);
    expect(opened.draft.seed.name).toBe(`Copy of ${longName}`.slice(0, 50));
    expect(opened.draft.seed.name.length).toBe(50);
    expect(opened.draft.seed.name.startsWith('Copy of ')).toBe(true);
  });

  it('refuses to copy a tenant or parking attendant role', () => {
    expect(openDraft({ kind: 'copy', role: role({ audience: 'parking' }) }, INDEX, true)).toEqual({
      ok: false,
      message: ROLE_NOT_COPYABLE_MESSAGE,
    });
  });

  it('opens a locked or view-only role as view, and a manageable custom role as edit', () => {
    const locked = openDraft({ kind: 'open', role: role() }, INDEX, true);
    expect(locked.ok && locked.draft.intent === 'view').toBe(true);

    const viewing = openDraft(
      { kind: 'open', role: role({ kind: 'custom', isLocked: false, id: 'r-1' }) },
      INDEX,
      false,
    );
    expect(viewing.ok && viewing.draft.intent === 'view').toBe(true);

    const editing = openDraft(
      { kind: 'open', role: role({ kind: 'custom', isLocked: false, id: 'r-1' }) },
      INDEX,
      true,
    );
    expect(editing).toMatchObject({ ok: true, draft: { intent: 'edit', roleId: 'r-1' } });
  });
});

describe('picker writes and projection', () => {
  const empty = { selected: new Set<string>(), unknown: [] as string[] };

  it('toggles an unlocked code and leaves locked codes alone', () => {
    const on = togglePermission(empty, 'payments:view', INDEX, EVERY_CODE);
    expect([...on.selected]).toEqual(['payments:view']);
    expect(togglePermission(on, 'payments:view', INDEX, EVERY_CODE).selected.has('payments:view')).toBe(
      false,
    );
    expect(togglePermission(on, 'roles:manage', INDEX, EVERY_CODE)).toBe(on);
    expect(togglePermission(on, 'payments:void', INDEX, LIMITED)).toBe(on);
    expect(togglePermission(on, 'missing:code', INDEX, EVERY_CODE)).toBe(on);
  });

  it('selects only visible unlocked codes and does not clear a hidden selection', () => {
    const seeded = {
      selected: new Set(['payments:view', 'members:view']),
      unknown: [] as string[],
    };
    const afterVoid = toggleGroup(seeded, 'payments', INDEX, EVERY_CODE, 'void');
    expect([...afterVoid.selected].sort()).toEqual(['members:view', 'payments:view', 'payments:void']);

    const clearedVoid = toggleGroup(afterVoid, 'payments', INDEX, EVERY_CODE, 'void');
    expect([...clearedVoid.selected].sort()).toEqual(['members:view', 'payments:view']);
  });

  it('hides rows that miss the filter and keeps group and total counts on the full set', () => {
    const pick = { selected: new Set(['payments:view', 'payments:void']), unknown: ['ghost:code'] };
    const view = projectPicker(INDEX, pick, EVERY_CODE, 'void', true);
    const payments = view.groups.find((group) => group.id === 'payments');

    expect(view.totalSelected).toBe(2);
    expect(view.totalCodes).toBe(5);
    expect(view.unknown).toEqual(['ghost:code']);
    expect(payments?.selected).toBe(2);
    expect(payments?.visible).toBe(1);
    expect(payments?.permissions.map((row) => row.code)).toEqual(['payments:void']);
    expect(view.groups.some((group) => group.id === 'team')).toBe(false);
  });

  it('shows grantable first, then not-held, and disables every row when the draft is not writable', () => {
    const view = projectPicker(INDEX, empty, LIMITED, '', true);
    const byCode = Object.fromEntries(
      view.groups.flatMap((group) => group.permissions.map((row) => [row.code, row])),
    );

    expect(byCode['roles:manage']).toMatchObject({
      disabled: true,
      reason: 'Owner and admin only.',
    });
    expect(byCode['payments:void']).toMatchObject({
      disabled: true,
      reason: "You can't give a permission you don't have.",
    });
    expect(byCode['payments:view']).toMatchObject({ disabled: false, reason: null });

    const locked = projectPicker(INDEX, empty, EVERY_CODE, '', false);
    expect(locked.groups.flatMap((group) => group.permissions).every((row) => row.disabled)).toBe(true);
    expect(locked.groups.find((group) => group.id === 'team')?.selectAllEnabled).toBe(false);
  });

  it('computes select-all from the visible unlocked subset', () => {
    const pick = { selected: new Set(['payments:view']), unknown: [] as string[] };
    const some = projectPicker(INDEX, pick, EVERY_CODE, '', true).groups.find(
      (group) => group.id === 'payments',
    );
    const all = projectPicker(
      INDEX,
      { selected: new Set(['payments:view', 'payments:void']), unknown: [] },
      EVERY_CODE,
      '',
      true,
    ).groups.find((group) => group.id === 'payments');

    expect(some?.selectAll).toBe('some');
    expect(some?.selectAllEnabled).toBe(true);
    expect(all?.selectAll).toBe('all');
  });
});

describe('writePayload', () => {
  it('trims the name, collapses inner spaces, and sends an empty description as null', () => {
    const body = writePayload(
      { name: '  Leasing   agent  ', description: '   ' },
      { selected: new Set(['members:view', 'payments:void', 'roles:manage', 'ghost:code']), unknown: ['ghost:code'] },
      INDEX,
    );

    expect(body).toEqual({
      name: 'Leasing agent',
      description: null,
      permissions: ['payments:void', 'members:view'],
    });
  });

  it('keeps a trimmed description', () => {
    expect(
      writePayload({ name: 'Clerk', description: '  Front desk  ' }, { selected: new Set(), unknown: [] }, INDEX)
        .description,
    ).toBe('Front desk');
  });
});
