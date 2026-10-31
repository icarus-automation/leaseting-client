import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Permission } from '../../../../core/auth/permissions';
import type { Role } from '../../../../core/models/role.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { RolesService } from '../../services/roles.service';
import { RolesDirectory } from './roles-directory';

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
    permissions: ['members:view'],
    memberCount: 2,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const LONG_DESCRIPTION =
  'Front desk staff who onboard tenants, draw up leases, and answer questions about bills all day long.';

const ROLES: Role[] = [
  role({ id: 'owner', name: 'Owner', description: 'Owns the organization.', memberCount: 1 }),
  role({ id: 'tenant', name: 'Tenant', description: 'Residence Care only.', audience: 'tenant', memberCount: 4 }),
  role({
    id: 'parking_attendant',
    name: 'Parking attendant',
    description: 'Handheld only.',
    audience: 'parking',
    memberCount: 0,
  }),
  role({
    id: 'r-agent',
    name: 'Leasing agent',
    description: LONG_DESCRIPTION,
    kind: 'custom',
    isLocked: false,
    memberCount: 3,
  }),
  role({
    id: 'r-night',
    name: 'Night clerk',
    description: null,
    kind: 'custom',
    isLocked: false,
    isActive: false,
    isAssignable: false,
    memberCount: 0,
  }),
];

describe('RolesDirectory', () => {
  const roles = { list: vi.fn(), setActive: vi.fn(), remove: vi.fn() };
  const confirm = { danger: vi.fn(), proceed: vi.fn() };
  const held = { can: true };
  const auth = { can: (code: Permission) => code === 'roles:manage' && held.can };
  let fixture: ComponentFixture<RolesDirectory>;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(RolesDirectory);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    held.can = true;
    roles.list.mockReturnValue(of(ROLES));

    await TestBed.configureTestingModule({
      imports: [RolesDirectory],
      providers: [
        provideRouter([]),
        { provide: RolesService, useValue: roles },
        { provide: AuthService, useValue: auth },
        { provide: ConfirmService, useValue: confirm },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
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

  function cell(name: string, index: number): HTMLTableCellElement {
    return rowFor(name).querySelectorAll('td')[index];
  }

  function actionsButton(name: string): HTMLButtonElement {
    return rowFor(name).querySelector(`button[aria-label="Actions for ${name}"]`) as HTMLButtonElement;
  }

  function buttonLabelled(root: ParentNode, label: string): HTMLButtonElement | undefined {
    const buttons: HTMLButtonElement[] = [...root.querySelectorAll('button')];
    return buttons.find((button) => button.textContent?.trim() === label);
  }

  /** The labels in a row's actions menu, with a divider shown as a dash. */
  function menuFor(name: string): string[] {
    actionsButton(name).click();
    fixture.detectChanges();
    const items = fixture.componentInstance.overflowItems();
    return items.map((item) => (item.separator ? '-' : (item.label ?? '')));
  }

  function menuItem(name: string, label: string): MenuItem {
    menuFor(name);
    const item = fixture.componentInstance.overflowItems().find((candidate) => candidate.label === label);
    if (!item) throw new Error(`${label} is not in the ${name} menu`);
    return item;
  }

  it('shows a loading skeleton until the list arrives', async () => {
    const pending = new Subject<Role[]>();
    roles.list.mockReturnValue(pending);
    await render();

    expect(fixture.nativeElement.querySelector('app-skeleton')).toBeTruthy();

    pending.next(ROLES);
    pending.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-skeleton')).toBeFalsy();
    expect(rowFor('Leasing agent').textContent).toContain('3 people');
  });

  it('shows the load error and retries', async () => {
    roles.list.mockReturnValue(throwError(() => ({ status: 500, error: { message: 'Roles are down.' } })));
    await render();

    expect(fixture.nativeElement.textContent).toContain('Roles are down.');
    roles.list.mockReturnValue(of(ROLES));
    buttonLabelled(fixture.nativeElement, 'Retry')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(rowFor('Owner')).toBeTruthy();
  });

  it('narrows rows when the search changes', async () => {
    await render();

    fixture.componentInstance.setQuery({ search: 'Leasing' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(rowFor('Leasing agent')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Owns the organization.');
  });

  describe('columns', () => {
    it('reads a system role as just System with a lock beside it, and a custom role as Custom', async () => {
      await render();

      const system = cell('Owner', 3);
      expect(system.textContent?.trim()).toBe('System');
      expect(system.querySelector('svg')).toBeTruthy();
      expect(rowFor('Owner').textContent).not.toContain('Locked');
      const custom = cell('Leasing agent', 3);
      expect(custom.textContent?.trim()).toBe('Custom');
      expect(custom.querySelector('svg')).toBeNull();
    });

    it('right-aligns People and keeps it on one line', async () => {
      await render();

      const people = cell('Leasing agent', 2);
      expect(people.classList).toContain('text-right');
      expect(people.classList).toContain('whitespace-nowrap');
      const heading = fixture.nativeElement.querySelectorAll('thead th')[2] as HTMLElement;
      expect(heading.textContent?.trim()).toBe('People');
      expect(heading.classList).toContain('text-right');
    });

    it('clamps a description to two lines, with a dash when there is none', async () => {
      await render();

      const description = cell('Leasing agent', 1).querySelector('p') as HTMLElement;
      expect(description.classList).toContain('line-clamp-2');
      expect(description.textContent?.trim()).toBe(LONG_DESCRIPTION);
      expect(cell('Night clerk', 1).textContent?.trim()).toBe('—');
    });

    it('puts the full description in a tooltip only while it is cut off', async () => {
      await render();
      const description = cell('Leasing agent', 1).querySelector('p') as HTMLElement;

      Object.defineProperty(description, 'scrollHeight', { configurable: true, value: 60 });
      Object.defineProperty(description, 'clientHeight', { configurable: true, value: 40 });
      description.dispatchEvent(new MouseEvent('mouseenter'));
      expect(description.getAttribute('title')).toBe(LONG_DESCRIPTION);

      Object.defineProperty(description, 'scrollHeight', { configurable: true, value: 40 });
      description.dispatchEvent(new MouseEvent('mouseenter'));
      expect(description.hasAttribute('title')).toBe(false);
    });
  });

  describe('inactive roles', () => {
    it('has no Active column or switches, since Turn off and Turn on are in the menu', async () => {
      await render();

      const headers = [...fixture.nativeElement.querySelectorAll('thead th')].map((th) => (th as HTMLElement).textContent?.trim());
      expect(headers).toEqual(['Name', 'Description', 'People', 'Type', 'Actions']);
      expect(fixture.nativeElement.querySelector('[role="switch"]')).toBeNull();
    });

    it('marks a role that is off with an Inactive badge beside its name, and no other', async () => {
      await render();

      expect(cell('Night clerk', 0).textContent).toContain('Inactive');
      expect(cell('Leasing agent', 0).textContent).not.toContain('Inactive');
      expect(cell('Owner', 0).textContent).not.toContain('Inactive');
    });

    it('still shows who is off to someone who cannot manage roles', async () => {
      held.can = false;
      await render();

      expect(cell('Night clerk', 0).textContent).toContain('Inactive');
    });

    it('turns a role off from its menu, through the confirm, then marks it Inactive', async () => {
      roles.setActive.mockReturnValue(of({ ...ROLES[3], isActive: false }));
      await render();

      menuItem('Leasing agent', 'Turn off').command?.({});
      expect(confirm.proceed).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Turn off this role?', acceptLabel: 'Turn off' }),
      );
      expect(roles.setActive).not.toHaveBeenCalled();

      confirm.proceed.mock.calls[0][0].onAccept();
      fixture.detectChanges();

      expect(roles.setActive).toHaveBeenCalledWith('r-agent', false);
      expect(cell('Leasing agent', 0).textContent).toContain('Inactive');
      expect(menuFor('Leasing agent')).toContain('Turn on');
    });

    it('turns a role back on from its menu and drops the badge', async () => {
      roles.setActive.mockReturnValue(of({ ...ROLES[4], isActive: true }));
      await render();

      menuItem('Night clerk', 'Turn on').command?.({});
      expect(confirm.proceed).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Turn this role on?', acceptLabel: 'Turn on' }),
      );
      confirm.proceed.mock.calls[0][0].onAccept();
      fixture.detectChanges();

      expect(roles.setActive).toHaveBeenCalledWith('r-night', true);
      expect(cell('Night clerk', 0).textContent).not.toContain('Inactive');
    });
  });

  describe('actions menu', () => {
    it('gives a custom role Edit, Duplicate, Turn off, then a divider and Delete', async () => {
      await render();

      expect(menuFor('Leasing agent')).toEqual(['Edit', 'Duplicate', 'Turn off', '-', 'Delete']);
    });

    it('offers Turn on for a role that is off', async () => {
      await render();

      expect(menuFor('Night clerk')).toEqual(['Edit', 'Duplicate', 'Turn on', '-', 'Delete']);
    });

    it('gives Owner View and Duplicate', async () => {
      await render();

      expect(menuFor('Owner')).toEqual(['View', 'Duplicate']);
    });

    it('gives Tenant and Parking attendant View only', async () => {
      await render();

      expect(menuFor('Tenant')).toEqual(['View']);
      expect(menuFor('Parking attendant')).toEqual(['View']);
    });

    it('gives someone who cannot manage roles View on every role', async () => {
      held.can = false;
      await render();

      expect(menuFor('Leasing agent')).toEqual(['View']);
      expect(menuFor('Owner')).toEqual(['View']);
    });

    it('draws Delete in the danger style', async () => {
      await render();

      expect(menuItem('Leasing agent', 'Delete').styleClass).toBe('row-overflow-danger');
    });

    it('opens the role from View, Edit and Duplicate', async () => {
      await render();

      menuItem('Owner', 'View').command?.({});
      expect(navigate).toHaveBeenLastCalledWith(['/settings/roles', 'owner']);
      menuItem('Leasing agent', 'Edit').command?.({});
      expect(navigate).toHaveBeenLastCalledWith(['/settings/roles', 'r-agent']);
      menuItem('Owner', 'Duplicate').command?.({});
      expect(navigate).toHaveBeenLastCalledWith(['/settings/roles', 'new'], { queryParams: { from: 'owner' } });
    });

    it('asks before it deletes a role nobody holds', async () => {
      await render();

      menuItem('Night clerk', 'Delete').command?.({});

      expect(confirm.danger).toHaveBeenCalledWith(
        expect.objectContaining({ header: 'Delete this role?', acceptLabel: 'Delete' }),
      );
      expect(roles.remove).not.toHaveBeenCalled();
    });

    it('deletes only after the confirm is accepted', async () => {
      roles.remove.mockReturnValue(of(ROLES[4]));
      await render();
      menuItem('Night clerk', 'Delete').command?.({});

      confirm.danger.mock.calls[0][0].onAccept();
      fixture.detectChanges();

      expect(roles.remove).toHaveBeenCalledWith('r-night');
      expect(fixture.nativeElement.textContent).not.toContain('Night clerk');
    });

    it('refuses to delete a role people hold, and says who to move', async () => {
      await render();

      menuItem('Leasing agent', 'Delete').command?.({});
      fixture.detectChanges();

      expect(confirm.danger).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('3 people have this role.');
    });
  });

  describe('opening a role', () => {
    it('opens the role from anywhere in its row', async () => {
      await render();

      cell('Leasing agent', 1).click();
      expect(navigate).toHaveBeenLastCalledWith(['/settings/roles', 'r-agent']);
      cell('Owner', 2).click();
      expect(navigate).toHaveBeenLastCalledWith(['/settings/roles', 'owner']);
      cell('Tenant', 3).click();
      expect(navigate).toHaveBeenLastCalledWith(['/settings/roles', 'tenant']);
    });

    it('does not open the role when the actions button is pressed', async () => {
      await render();

      actionsButton('Leasing agent').click();

      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
