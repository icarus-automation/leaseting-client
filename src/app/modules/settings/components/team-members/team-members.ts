import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';
import type { MenuItem } from 'primeng/api';
import { MessageService } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';
import { Observable, Subject, debounceTime, map, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PageMeta } from '../../../../core/models/api.types';
import { INVITATION_ROLE_LABELS, type Invitation } from '../../../../core/models/invitation.types';
import type { Member, MemberAudienceFilter, MemberStatus } from '../../../../core/models/member.types';
import type { ParkingAttendantResponse } from '../../../../core/models/parking-attendant.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { SegmentedControl, type SegmentedOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { showPopupMenu } from '../../../../shared/utils/popup-menu.util';
import { InvitationsService } from '../../services/invitations.service';
import { MembersService } from '../../services/members.service';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import { TenantLoginsService } from '../../services/tenant-logins.service';
import {
  type MemberAction,
  type MemberActor,
  initialsOf,
  invitationExpiry,
  memberActions,
  memberStatusBadge,
  propertyAccessLabel,
} from '../../utils/member-access.util';
import { ATTENDANT_HANDHELD_NOTE } from '../../utils/parking-attendant.util';
import { TenantLoginLookupError, sameEmail } from '../../utils/tenant-login.util';
import { AttendantFormDialog } from '../attendant-form-dialog/attendant-form-dialog';
import { AttendantPasswordDialog } from '../attendant-password-dialog/attendant-password-dialog';
import { ChangeRoleDialog } from '../change-role-dialog/change-role-dialog';
import { InviteStaffDialog } from '../invite-staff-dialog/invite-staff-dialog';
import { TenantLoginDialog, type TenantLoginOutcome } from '../tenant-login-dialog/tenant-login-dialog';

type StatusFilter = 'ALL' | MemberStatus | 'INVITED';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 250;

const AUDIENCE_OPTIONS: readonly SegmentedOption<MemberAudienceFilter>[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'tenants', label: 'Tenants' },
  { value: 'attendants', label: 'Attendants' },
];

const AUDIENCE_NOUNS: Record<MemberAudienceFilter, string> = {
  staff: 'staff',
  tenants: 'tenants',
  attendants: 'parking attendants',
};

/** `?audience=` on the Users URL picks the filter; anything else is Staff. */
function audienceFromParam(value: string | null): MemberAudienceFilter {
  return value === 'tenants' || value === 'attendants' ? value : 'staff';
}

/** What a login's row reads as once the API has turned it on or off. */
function withLoginStatus(member: Member, on: boolean): Member {
  return { ...member, status: on ? 'ACTIVE' : 'DEACTIVATED' };
}

@Component({
  selector: 'app-team-members',
  imports: [
    DatePipe,
    FormsModule,
    PIcon,
    Menu,
    Select,
    EmptyState,
    ErrorBanner,
    Pagination,
    SegmentedControl,
    Skeleton,
    StatusBadge,
    ChangeRoleDialog,
    InviteStaffDialog,
    AttendantFormDialog,
    AttendantPasswordDialog,
    TenantLoginDialog,
  ],
  templateUrl: './team-members.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamMembers {
  private readonly membersApi = inject(MembersService);
  private readonly invitationsApi = inject(InvitationsService);
  private readonly attendantsApi = inject(ParkingAttendantsService);
  private readonly tenantLogins = inject(TenantLoginsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly audienceOptions = AUDIENCE_OPTIONS;
  readonly roleLabels = INVITATION_ROLE_LABELS;
  readonly skeletons = Array.from({ length: 4 });
  readonly handheldNote = ATTENDANT_HANDHELD_NOTE;

  readonly audience = signal<MemberAudienceFilter>(audienceFromParam(this.route.snapshot.queryParamMap.get('audience')));
  readonly status = signal<StatusFilter>('ALL');
  readonly searchText = signal('');
  private readonly query = signal('');
  private readonly search$ = new Subject<string>();

  readonly members = signal<Member[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly membersLoading = signal(true);
  readonly membersError = signal<string | null>(null);

  readonly invitations = signal<Invitation[] | null>(null);
  readonly invitationsError = signal<string | null>(null);

  readonly busyId = signal<string | null>(null);
  readonly flashId = signal<string | null>(null);
  readonly now = signal(new Date());

  readonly inviteOpen = signal(false);
  readonly roleDialogOpen = signal(false);
  readonly roleTarget = signal<Member | null>(null);

  readonly attendantFormOpen = signal(false);
  readonly attendantPasswordOpen = signal(false);
  readonly attendantTarget = signal<Member | null>(null);
  readonly tenantLoginOpen = signal(false);
  /** The tenant login whose password is being reset; none while setting one up. */
  readonly tenantLoginTarget = signal<Member | null>(null);
  /** The email of a login just added, so its row can flash once the list reloads. */
  private pendingFlashEmail: string | null = null;

  readonly overflowItems = signal<MenuItem[]>([]);
  readonly overflowForId = signal<string | null>(null);
  private readonly overflowMenu = viewChild.required<Menu>('overflowMenu');

  readonly canInvite = computed(() => this.auth.can('members:invite'));
  readonly canChangeRoles = computed(() => this.auth.can('members:update'));
  readonly canManageAttendants = computed(() => this.auth.can('parking_attendants:manage'));
  readonly canManageTenantLogins = computed(() => this.auth.can('tenants:manage_access'));
  readonly organizationName = computed(() => this.auth.activeOrganization()?.name ?? 'this organization');

  private readonly actor = computed<MemberActor>(() => ({
    userId: this.auth.currentUser()?.id ?? '',
    role: this.auth.currentUser()?.organizationRole ?? null,
    can: (code) => this.auth.can(code),
  }));
  readonly currentUserId = computed(() => this.actor().userId);

  readonly statusOptions = computed<{ label: string; value: StatusFilter }[]>(() =>
    this.audience() === 'staff'
      ? [
          { label: 'All statuses', value: 'ALL' },
          { label: 'Active', value: 'ACTIVE' },
          { label: 'Deactivated', value: 'DEACTIVATED' },
          { label: 'Invited', value: 'INVITED' },
        ]
      : [
          { label: 'All statuses', value: 'ALL' },
          { label: 'Active', value: 'ACTIVE' },
          { label: 'Login off', value: 'DEACTIVATED' },
        ],
  );

  readonly isStaff = computed(() => this.audience() === 'staff');
  readonly isTenants = computed(() => this.audience() === 'tenants');
  readonly isAttendants = computed(() => this.audience() === 'attendants');
  /** Tenants answer for their own lease, so the column is for staff and attendants. */
  readonly showPropertyAccess = computed(() => !this.isTenants());
  /** A tenant or attendant row has actions only for someone who can manage their logins. */
  readonly showActions = computed(
    () =>
      this.isStaff() ||
      (this.isTenants() && this.canManageTenantLogins()) ||
      (this.isAttendants() && this.canManageAttendants()),
  );
  /** The one thing to add on this filter: a staff invitation, a tenant login, or an attendant. */
  readonly primaryAction = computed<{ label: string; run: () => void } | null>(() => {
    if (this.isStaff()) return this.canInvite() ? { label: 'Invite staff', run: () => this.openInvite() } : null;
    if (this.isTenants()) {
      return this.canManageTenantLogins() ? { label: 'Add tenant login', run: () => this.openAddTenantLogin() } : null;
    }
    return this.canManageAttendants() ? { label: 'Add attendant', run: () => this.openAddAttendant() } : null;
  });
  readonly showMembers = computed(() => this.status() !== 'INVITED');
  readonly showInvitations = computed(
    () => this.isStaff() && (this.status() === 'ALL' || this.status() === 'INVITED'),
  );
  readonly isFiltered = computed(() => this.query().length > 0 || this.status() !== 'ALL');
  readonly audienceNoun = computed(() => AUDIENCE_NOUNS[this.audience()]);

  readonly visibleInvitations = computed(() => {
    const list = this.invitations() ?? [];
    const q = this.query().toLowerCase();
    return q ? list.filter((invitation) => invitation.email.toLowerCase().includes(q)) : list;
  });

  constructor() {
    this.search$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe((text) => {
        if (text === this.query()) return;
        this.query.set(text);
        this.loadMembers(1);
      });

    // The URL names the filter, so a link or the old attendants address can land on it.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.applyAudience(audienceFromParam(params.get('audience'))));

    this.loadMembers(1);
    this.loadInvitations();
  }

  onSearch(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.searchText.set(text);
    this.search$.next(text.trim());
  }

  setAudience(audience: MemberAudienceFilter): void {
    if (this.audience() === audience) return;
    this.applyAudience(audience);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { audience: audience === 'staff' ? null : audience },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private applyAudience(audience: MemberAudienceFilter): void {
    if (this.audience() === audience) return;
    this.audience.set(audience);
    if (this.status() === 'INVITED') this.status.set('ALL');
    this.loadMembers(1);
  }

  setStatus(status: StatusFilter): void {
    this.status.set(status);
    this.loadMembers(1);
  }

  clearFilters(): void {
    this.searchText.set('');
    this.query.set('');
    // Supersedes a search still waiting out the debounce.
    this.search$.next('');
    this.status.set('ALL');
    this.loadMembers(1);
  }

  loadMembers(page: number): void {
    if (!this.showMembers()) return;
    const status = this.status();
    this.membersLoading.set(true);
    this.membersError.set(null);
    this.membersApi
      .list({
        audience: this.audience(),
        status: status === 'ACTIVE' || status === 'DEACTIVATED' ? status : undefined,
        q: this.query() || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.members.set(result.data);
          this.meta.set(result.meta);
          this.membersLoading.set(false);
          this.flashAddedLogin(result.data);
        },
        error: (error: unknown) => {
          this.membersLoading.set(false);
          this.membersError.set(apiErrorMessage(error, 'Could not load people.'));
        },
      });
  }

  loadInvitations(): void {
    this.invitations.set(null);
    this.invitationsError.set(null);
    this.invitationsApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.now.set(new Date());
          this.invitations.set(list);
        },
        error: (error: unknown) =>
          this.invitationsError.set(apiErrorMessage(error, 'Could not load invitations.')),
      });
  }

  initials(name: string): string {
    return initialsOf(name);
  }

  statusBadge(member: Member) {
    return memberStatusBadge(member);
  }

  propertyAccess(member: Member): string | null {
    return propertyAccessLabel(member);
  }

  expiry(invitation: Invitation) {
    return invitationExpiry(invitation, this.now());
  }

  actionsFor(member: Member): MemberAction[] {
    return memberActions(this.actor(), member);
  }

  openInvite(): void {
    this.inviteOpen.set(true);
  }

  onInvited(invitation: Invitation): void {
    this.toast.add({ severity: 'success', summary: 'Invitation sent', detail: invitation.email });
    this.flashId.set(invitation.id);
    if (!this.showInvitations()) {
      this.audience.set('staff');
      this.status.set('ALL');
      this.loadMembers(1);
    }
    this.loadInvitations();
  }

  openAddAttendant(): void {
    this.attendantFormOpen.set(true);
  }

  openAddTenantLogin(): void {
    this.tenantLoginTarget.set(null);
    this.tenantLoginOpen.set(true);
  }

  onAttendantAdded(attendant: ParkingAttendantResponse): void {
    this.toast.add({ severity: 'success', summary: 'Attendant added', detail: attendant.email });
    this.showNewLogin(attendant.email);
  }

  onAttendantPasswordReset(member: Member): void {
    this.toast.add({ severity: 'success', summary: 'Password reset', detail: member.name });
    this.flashId.set(member.id);
  }

  /** The dialog shows the temporary password itself; the list only needs to catch up. */
  onTenantLoginFinished(outcome: TenantLoginOutcome): void {
    if (outcome.kind === 'setup') {
      this.showNewLogin(outcome.email);
      return;
    }
    const target = this.tenantLoginTarget();
    if (target) this.flashId.set(target.id);
  }

  openActions(event: Event, member: Member): void {
    const items: MenuItem[] = this.actionsFor(member).map((action) => this.menuItem(action, member));
    this.overflowItems.set(items);
    this.overflowForId.set(member.id);
    showPopupMenu(this.overflowMenu(), event, items);
  }

  onRoleChanged(member: Member): void {
    this.toast.add({
      severity: 'success',
      summary: 'Role changed',
      detail: `${member.name} is now ${member.roleName ?? 'on a new role'}.`,
    });
    this.replaceMember(member);
  }

  resend(invitation: Invitation): void {
    this.runOnInvitation(invitation, () => this.invitationsApi.resend(invitation.id), 'Invitation resent');
  }

  confirmRevoke(invitation: Invitation): void {
    this.confirm.danger({
      header: 'Revoke invitation',
      message: `The link sent to ${invitation.email} stops working. You can invite them again later.`,
      acceptLabel: 'Revoke',
      onAccept: () =>
        this.runOnInvitation(invitation, () => this.invitationsApi.revoke(invitation.id), 'Invitation revoked'),
    });
  }

  private menuItem(action: MemberAction, member: Member): MenuItem {
    switch (action) {
      case 'change-role':
        return { label: 'Change role', command: () => this.openChangeRole(member) };
      case 'transfer-ownership':
        return { label: 'Transfer ownership', command: () => this.confirmTransfer(member) };
      case 'deactivate':
        return {
          label: 'Deactivate',
          styleClass: 'row-overflow-danger',
          command: () => this.confirmDeactivate(member),
        };
      case 'reactivate':
        return { label: 'Reactivate', command: () => this.reactivate(member) };
      case 'reset-password':
        return { label: 'Reset password', command: () => this.openResetPassword(member) };
      case 'disable-login':
        return {
          label: member.audience === 'tenant' ? 'Disable login' : 'Disable',
          styleClass: 'row-overflow-danger',
          command: () => this.confirmDisableLogin(member),
        };
      case 'enable-login':
        return {
          label: member.audience === 'tenant' ? 'Enable login' : 'Enable',
          command: () => this.enableLogin(member),
        };
    }
  }

  private openResetPassword(member: Member): void {
    if (member.audience === 'tenant') {
      this.tenantLoginTarget.set(member);
      this.tenantLoginOpen.set(true);
      return;
    }
    this.attendantTarget.set(member);
    this.attendantPasswordOpen.set(true);
  }

  private confirmDisableLogin(member: Member): void {
    if (member.audience === 'tenant') {
      this.confirm.danger({
        header: `Disable ${member.name}'s login?`,
        message: `${member.name} can't sign in to the Residence Care app until you enable the login, and any open session is signed out. Their lease and billing stay as they are.`,
        acceptLabel: 'Disable login',
        onAccept: () =>
          this.runOnMember(
            member,
            () => this.tenantLoginCall(member, (tenantId) => this.tenantLogins.disable(tenantId), false),
            `${member.name}'s login disabled`,
          ),
      });
      return;
    }
    this.confirm.danger({
      header: 'Disable attendant',
      message: `${member.name} can no longer sign in, and any handheld signed in as them is signed out. Past transactions are kept.`,
      acceptLabel: 'Disable',
      onAccept: () =>
        this.runOnMember(
          member,
          () => this.attendantsApi.disable(member.userId).pipe(map((attendant) => withLoginStatus(member, attendant.status === 'ACTIVE'))),
          'Attendant disabled',
        ),
    });
  }

  private enableLogin(member: Member): void {
    if (member.audience === 'tenant') {
      this.runOnMember(
        member,
        () => this.tenantLoginCall(member, (tenantId) => this.tenantLogins.enable(tenantId), true),
        `${member.name}'s login enabled`,
      );
      return;
    }
    this.runOnMember(
      member,
      () => this.attendantsApi.enable(member.userId).pipe(map((attendant) => withLoginStatus(member, attendant.status === 'ACTIVE'))),
      'Attendant enabled',
    );
  }

  /** Finds the tenant behind the login, makes the call, and returns the row as it now reads. */
  private tenantLoginCall(
    member: Member,
    call: (tenantId: string) => Observable<unknown>,
    on: boolean,
  ): Observable<Member> {
    return this.tenantLogins.findTenantId(member).pipe(
      switchMap((tenantId) => call(tenantId)),
      map(() => withLoginStatus(member, on)),
    );
  }

  /** After adding a login: drop filters that could hide it, reload, and flash its row. */
  private showNewLogin(email: string): void {
    this.pendingFlashEmail = email;
    this.clearFilters();
  }

  private flashAddedLogin(rows: Member[]): void {
    const email = this.pendingFlashEmail;
    if (!email) return;
    this.pendingFlashEmail = null;
    const added = rows.find((row) => sameEmail(row.email, email));
    if (added) this.flashId.set(added.id);
  }

  private openChangeRole(member: Member): void {
    this.roleTarget.set(member);
    this.roleDialogOpen.set(true);
  }

  private confirmDeactivate(member: Member): void {
    this.confirm.danger({
      header: `Deactivate ${member.name}?`,
      message: `${member.name} is signed out everywhere and can't open ${this.organizationName()} until an owner or admin reactivates them. Their records and history stay.`,
      acceptLabel: 'Deactivate',
      onAccept: () =>
        this.runOnMember(member, () => this.membersApi.deactivate(member.id), `${member.name} deactivated`),
    });
  }

  private reactivate(member: Member): void {
    this.runOnMember(member, () => this.membersApi.reactivate(member.id), `${member.name} reactivated`);
  }

  private confirmTransfer(member: Member): void {
    this.confirm.danger({
      header: 'Transfer ownership',
      message: `Make ${member.name} the owner of ${this.organizationName()}? You become an admin, and only the new owner can transfer ownership again or change admins.`,
      acceptLabel: 'Transfer ownership',
      onAccept: () => this.transfer(member),
    });
  }

  private transfer(member: Member): void {
    this.busyId.set(member.id);
    this.membersApi
      .transferOwnership(member.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ newOwner }) => {
          this.busyId.set(null);
          this.toast.add({ severity: 'success', summary: 'Ownership transferred', detail: `${newOwner.name} is now the owner.` });
          this.flashId.set(newOwner.id);
          // Your own role changed with it; the actions above follow the new one.
          this.auth.refreshMe().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ error: () => undefined });
          this.loadMembers(this.meta()?.page ?? 1);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'Could not transfer ownership',
            detail: apiErrorMessage(error),
          });
        },
      });
  }

  private runOnMember(member: Member, request: () => Observable<Member>, summary: string): void {
    this.busyId.set(member.id);
    request()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.toast.add({ severity: 'success', summary });
          this.replaceMember(updated);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({
            severity: 'error',
            summary: `Could not update ${member.name}`,
            detail: error instanceof TenantLoginLookupError ? error.message : apiErrorMessage(error),
          });
        },
      });
  }

  private runOnInvitation(invitation: Invitation, request: () => Observable<Invitation>, summary: string): void {
    this.busyId.set(invitation.id);
    request()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyId.set(null);
          this.toast.add({ severity: 'success', summary, detail: updated.email });
          this.now.set(new Date());
          this.invitations.update((list) =>
            (list ?? [])
              .map((existing) => (existing.id === updated.id ? updated : existing))
              .filter((existing) => existing.status === 'PENDING' || existing.status === 'EXPIRED'),
          );
          if (updated.status === 'PENDING') this.flashId.set(updated.id);
        },
        error: (error: unknown) => {
          this.busyId.set(null);
          this.toast.add({ severity: 'error', summary: 'Could not update the invitation', detail: apiErrorMessage(error) });
          this.loadInvitations();
        },
      });
  }

  /** Swaps the row in place, unless the status filter no longer matches it. */
  private replaceMember(updated: Member): void {
    const status = this.status();
    const stillMatches = status === 'ALL' || status === updated.status;
    if (!stillMatches) {
      this.loadMembers(this.meta()?.page ?? 1);
      return;
    }
    this.members.update((list) => list.map((existing) => (existing.id === updated.id ? updated : existing)));
    this.flashId.set(updated.id);
  }
}
