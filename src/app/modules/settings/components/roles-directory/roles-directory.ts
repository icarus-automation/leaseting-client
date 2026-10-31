import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import type { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { Role } from '../../../../core/models/role.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { showPopupMenu } from '../../../../shared/utils/popup-menu.util';
import { RolesService } from '../../services/roles.service';
import {
  ACTIVITY_FILTERS,
  KIND_FILTERS,
  USERS_SETTINGS_HREF,
  filterRoles,
  presentRole,
  type RoleListQuery,
  type RoleRow,
} from '../../utils/role-access.util';

@Component({
  selector: 'app-roles-directory',
  imports: [RouterLink, PIcon, Menu, EmptyState, ErrorBanner, SegmentedControl, Skeleton, StatusBadge],
  templateUrl: './roles-directory.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesDirectory {
  private readonly rolesApi = inject(RolesService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly kindOptions = KIND_FILTERS;
  readonly activityOptions = ACTIVITY_FILTERS;
  readonly skeletons = Array.from({ length: 5 });

  readonly rows = signal<Role[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<{ message: string; usersHref?: string } | null>(null);
  readonly searchText = signal('');
  readonly query = signal<RoleListQuery>({ kind: 'all', activity: 'all', search: '' });
  readonly busyId = signal<string | null>(null);

  readonly overflowItems = signal<MenuItem[]>([]);
  readonly overflowForId = signal<string | null>(null);
  private readonly overflowMenu = viewChild.required<Menu>('overflowMenu');

  readonly canManage = computed(() => this.auth.can('roles:manage'));
  readonly visible = computed(() =>
    filterRoles(this.rows() ?? [], this.query()).map((role) => presentRole(role, this.canManage())),
  );
  readonly isFiltered = computed(() => {
    const query = this.query();
    return query.kind !== 'all' || query.activity !== 'all' || query.search.length > 0;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.rows.set(null);
    this.error.set(null);
    this.rolesApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.rows.set(rows),
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load roles.')),
      });
  }

  onSearch(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.searchText.set(text);
    this.setQuery({ search: text.trim() });
  }

  setQuery(patch: Partial<RoleListQuery>): void {
    this.query.update((current) => ({ ...current, ...patch }));
  }

  clearFilters(): void {
    this.searchText.set('');
    this.query.set({ kind: 'all', activity: 'all', search: '' });
  }

  create(): void {
    void this.router.navigate(['/settings/roles', 'new']);
  }

  open(role: Role): void {
    void this.router.navigate(['/settings/roles', role.id]);
  }

  /** The whole row opens the role; its own controls (name link, switch, menu) do their own thing. */
  onRowClick(event: MouseEvent, role: Role): void {
    if ((event.target as HTMLElement).closest('a, button')) return;
    this.open(role);
  }

  /**
   * Gives a description a tooltip with its full text, but only while it is cut
   * off. Checked on hover, so it follows the column as the window resizes.
   */
  syncDescriptionTitle(event: Event, text: string): void {
    const element = event.currentTarget as HTMLElement;
    if (element.scrollHeight > element.clientHeight) element.setAttribute('title', text);
    else element.removeAttribute('title');
  }

  openMenu(event: Event, row: RoleRow): void {
    const items = this.menuItems(row);
    this.overflowItems.set(items);
    this.overflowForId.set(row.role.id);
    showPopupMenu(this.overflowMenu(), event, items);
  }

  private menuItems(row: RoleRow): MenuItem[] {
    const { role } = row;
    return row.menu.flatMap((action): MenuItem[] => {
      switch (action) {
        case 'view':
          return [{ label: 'View', command: () => this.open(role) }];
        case 'edit':
          return [{ label: 'Edit', command: () => this.open(role) }];
        case 'duplicate':
          return [{ label: 'Duplicate', command: () => this.duplicate(role) }];
        case 'toggle-active':
          return [{ label: role.isActive ? 'Turn off' : 'Turn on', command: () => this.confirmToggle(role) }];
        case 'delete':
          return [
            { separator: true },
            { label: 'Delete', styleClass: 'row-overflow-danger', command: () => this.confirmDelete(role) },
          ];
      }
    });
  }

  duplicate(role: Role): void {
    void this.router.navigate(['/settings/roles', 'new'], { queryParams: { from: role.id } });
  }

  confirmToggle(role: Role): void {
    this.notice.set(null);
    this.confirm.proceed({
      header: role.isActive ? 'Turn off this role?' : 'Turn this role on?',
      message: role.isActive
        ? 'People who already have this role keep their access. Nobody new can be given this role until you turn it back on.'
        : 'People can be given this role again.',
      acceptLabel: role.isActive ? 'Turn off' : 'Turn on',
      onAccept: () => this.toggle(role),
    });
  }

  confirmDelete(role: Role): void {
    this.notice.set(null);
    const refusal = presentRole(role, this.canManage()).deleteRefusal;
    if (refusal) {
      this.notice.set(refusal);
      return;
    }
    this.confirm.danger({
      header: 'Delete this role?',
      message: `Delete "${role.name}"? This cannot be undone.`,
      acceptLabel: 'Delete',
      onAccept: () => this.remove(role),
    });
  }

  private toggle(role: Role): void {
    this.busyId.set(role.id);
    this.rolesApi
      .setActive(role.id, !role.isActive)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.replace(updated);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          if (statusOf(error) === 409) this.load();
          this.notice.set({ message: apiErrorMessage(error, 'Could not update this role.') });
        },
      });
  }

  private remove(role: Role): void {
    this.busyId.set(role.id);
    this.rolesApi
      .remove(role.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.rows.update((list) => list?.filter((row) => row.id !== role.id) ?? list);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.notice.set({
            message: apiErrorMessage(error, 'Could not delete this role.'),
            usersHref: USERS_SETTINGS_HREF,
          });
        },
      });
  }

  private replace(updated: Role): void {
    this.rows.update((list) => list?.map((row) => (row.id === updated.id ? updated : row)) ?? list);
  }
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    return (error as { status?: number }).status;
  }
  return undefined;
}
