import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import { catchError, forkJoin, of } from 'rxjs';
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/auth/auth.service';
import type { AccessCatalog } from '../../../../core/models/access-catalog.types';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { Member } from '../../../../core/models/member.types';
import type { Role } from '../../../../core/models/role.types';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { AccessCatalogService } from '../../services/access-catalog.service';
import { MembersService } from '../../services/members.service';
import { RolesService } from '../../services/roles.service';
import { type MemberActor, assignableRoles } from '../../utils/member-access.util';
import { permissionChanges } from '../../utils/role-change.util';

/** How many gained or lost permissions to name before "and N more". */
const LISTED_CHANGES = 5;

interface ChangeSummary {
  count: number;
  /** The first few labels, comma-separated. */
  listed: string;
  more: number;
}

function summarize(labels: readonly string[]): ChangeSummary {
  return {
    count: labels.length,
    listed: labels.slice(0, LISTED_CHANGES).join(', '),
    more: Math.max(labels.length - LISTED_CHANGES, 0),
  };
}

@Component({
  selector: 'app-change-role-dialog',
  imports: [ProgressSpinner, PIcon, ErrorBanner, FormDialog],
  templateUrl: './change-role-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeRoleDialog {
  private readonly auth = inject(AuthService);
  private readonly roles = inject(RolesService);
  private readonly catalog = inject(AccessCatalogService);
  private readonly members = inject(MembersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly member = input<Member | null>(null);
  readonly changed = output<Member>();

  readonly roleList = signal<Role[] | null>(null);
  readonly catalogData = signal<AccessCatalog | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly selectedId = signal<string | null>(null);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly actor = computed<MemberActor>(() => ({
    userId: this.auth.currentUser()?.id ?? '',
    role: this.auth.currentUser()?.organizationRole ?? null,
    can: (code) => this.auth.can(code),
    propertyAccess: this.auth.propertyAccess(),
  }));

  readonly options = computed(() => {
    const member = this.member();
    const roles = this.roleList();
    return member && roles ? assignableRoles(roles, member, this.actor()) : [];
  });

  readonly currentRole = computed(() => {
    const member = this.member();
    return this.roleList()?.find((role) => role.id === member?.role) ?? null;
  });

  readonly selected = computed(() => this.options().find((role) => role.id === this.selectedId()) ?? null);

  readonly changes = computed(() => {
    const selected = this.selected();
    if (!selected) return null;
    const { gained, lost } = permissionChanges(
      this.currentRole()?.permissions ?? [],
      selected.permissions,
      this.catalogData(),
    );
    return { gained: summarize(gained), lost: summarize(lost) };
  });

  readonly heading = computed(() => `Change ${this.member()?.name ?? 'their'}'s role`);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      untracked(() => {
        this.selectedId.set(null);
        this.errorMessage.set(null);
        this.saving.set(false);
        this.load();
      });
    });
  }

  load(): void {
    this.roleList.set(null);
    this.loadError.set(null);
    forkJoin({
      roles: this.roles.list(),
      catalog: this.catalog.catalog().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ roles, catalog }) => {
          this.catalogData.set(catalog);
          this.roleList.set(roles);
        },
        error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load the roles.')),
      });
  }

  select(roleId: string): void {
    this.selectedId.set(roleId);
    this.errorMessage.set(null);
  }

  submit(event?: Event): void {
    event?.preventDefault();
    const member = this.member();
    const role = this.selected();
    if (!member || !role) {
      this.errorMessage.set('Pick the role to give them.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.members
      .changeRole(member.id, role.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.visible.set(false);
          this.changed.emit(updated);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.errorMessage.set(apiErrorMessage(error, 'Could not change the role.'));
        },
      });
  }
}
