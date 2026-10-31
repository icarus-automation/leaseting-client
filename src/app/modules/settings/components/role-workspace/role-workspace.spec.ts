import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Permission } from '../../../../core/auth/permissions';
import type { AccessCatalog } from '../../../../core/models/access-catalog.types';
import type { Role } from '../../../../core/models/role.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { AccessCatalogService } from '../../services/access-catalog.service';
import { RolesService } from '../../services/roles.service';
import { RoleWorkspace } from './role-workspace';

const CATALOG: AccessCatalog = {
  groups: [
    {
      id: 'payments',
      label: 'Payments',
      permissions: [
        {
          code: 'payments:view',
          label: 'View payments',
          description: 'See payments.',
          scopable: true,
          grantable: true,
        },
        {
          code: 'payments:void',
          label: 'Void payments',
          description: 'Reverse a payment.',
          scopable: true,
          grantable: true,
        },
      ],
    },
  ],
  roles: [],
};

const AGENT: Role = {
  id: 'r-agent',
  name: 'Leasing agent',
  description: 'Front desk.',
  kind: 'custom',
  isLocked: false,
  isActive: true,
  isAssignable: true,
  audience: 'staff',
  permissions: ['payments:view'],
  memberCount: 0,
  createdAt: '2026-10-30T02:15:00.000Z',
  updatedAt: '2026-10-30T02:15:00.000Z',
};

describe('RoleWorkspace', () => {
  const roles = { get: vi.fn(), create: vi.fn(), update: vi.fn() };
  const catalog = { catalog: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const user = signal({
    id: 'u-1',
    name: 'Olive',
    email: 'olive@example.com',
    organizationRole: 'owner',
    permissions: ['payments:view'],
  });
  const held = signal<Permission[]>(['roles:manage']);
  const auth = {
    currentUser: user,
    can: (code: Permission) => held().includes(code),
    refreshMe: vi.fn().mockReturnValue(of(user())),
  };
  let fixture: ComponentFixture<RoleWorkspace>;

  async function render(params: Record<string, string> = {}, query: Record<string, string> = {}): Promise<void> {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [RoleWorkspace],
      providers: [
        { provide: RolesService, useValue: roles },
        { provide: AccessCatalogService, useValue: catalog },
        { provide: AuthService, useValue: auth },
        { provide: ConfirmService, useValue: { danger: vi.fn(), proceed: vi.fn() } },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(params),
              queryParamMap: convertToParamMap(query),
            },
            paramMap: of(convertToParamMap(params)),
            queryParamMap: of(convertToParamMap(query)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleWorkspace);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    held.set(['roles:manage']);
    user.set({
      id: 'u-1',
      name: 'Olive',
      email: 'olive@example.com',
      organizationRole: 'owner',
      permissions: ['payments:view'],
    });
    catalog.catalog.mockReturnValue(of(CATALOG));
    roles.get.mockReturnValue(of(AGENT));
  });

  afterEach(() => {
    fixture?.destroy();
    vi.clearAllMocks();
  });

  it('disables a permission the actor does not hold and shows the reason', async () => {
    await render();

    const voidBox = fixture.nativeElement.querySelector('input[aria-label="Void payments"]') as HTMLInputElement;
    expect(voidBox.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain("You can't give a permission you don't have.");
    expect((fixture.nativeElement.querySelector('input[aria-label="View payments"]') as HTMLInputElement).disabled).toBe(
      false,
    );
  });

  it('opens a locked system role without a save button', async () => {
    roles.get.mockReturnValue(
      of({
        ...AGENT,
        id: 'owner',
        name: 'Owner',
        kind: 'system',
        isLocked: true,
      }),
    );
    await render({ roleId: 'owner' });

    expect(fixture.nativeElement.textContent).toContain('System · Locked');
    expect(fixture.nativeElement.querySelector('button[type="submit"]')).toBeNull();
    const name = fixture.nativeElement.querySelector('input[aria-label="Role name"]') as HTMLInputElement;
    expect(name.disabled).toBe(true);
  });

  it('pre-fills a duplicate as Copy of the source name', async () => {
    await render({}, { from: AGENT.id });

    const name = fixture.nativeElement.querySelector('input[aria-label="Role name"]') as HTMLInputElement;
    expect(name.value).toBe('Copy of Leasing agent');
    expect(roles.get).toHaveBeenCalledWith(AGENT.id);
  });
});
