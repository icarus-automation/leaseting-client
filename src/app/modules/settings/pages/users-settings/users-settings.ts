import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { AuditLog } from '../../components/audit-log/audit-log';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';
import { TeamMembers } from '../../components/team-members/team-members';

type UsersTab = 'members' | 'audit';

const TABS: readonly { id: UsersTab; label: string }[] = [
  { id: 'members', label: 'People' },
  { id: 'audit', label: 'Audit log' },
];

@Component({
  selector: 'app-users-settings-page',
  imports: [SettingsPageShell, TeamMembers, AuditLog],
  template: `
    <app-settings-page-shell section="users">
      @if (canViewAudit()) {
        <div class="flex flex-col gap-5">
          <div class="flex gap-5 border-b border-border" role="tablist" aria-label="Users">
            @for (tab of tabs; track tab.id) {
              <button
                #tabButton
                type="button"
                role="tab"
                class="-mb-px border-b-2 px-0.5 pb-2.5 text-[13.5px] font-medium transition-colors duration-150 ease-out focus-visible:rounded-[2px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring motion-reduce:transition-none"
                [class]="activeTab() === tab.id ? 'border-primary text-heading' : 'border-transparent text-muted hover:text-body'"
                [id]="'users-tab-' + tab.id"
                [attr.aria-selected]="activeTab() === tab.id"
                [attr.aria-controls]="'users-panel-' + tab.id"
                [attr.tabindex]="activeTab() === tab.id ? 0 : -1"
                (click)="select(tab.id)"
                (keydown)="onTabKeydown($event)"
              >
                {{ tab.label }}
              </button>
            }
          </div>

          @if (activeTab() === 'audit') {
            <div role="tabpanel" id="users-panel-audit" aria-labelledby="users-tab-audit">
              <app-audit-log />
            </div>
          } @else {
            <div role="tabpanel" id="users-panel-members" aria-labelledby="users-tab-members">
              <app-team-members />
            </div>
          }
        </div>
      } @else {
        <app-team-members />
      }
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersSettingsPage {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  readonly tabs = TABS;

  /** The audit log answers to `members:update`: owners and admins. */
  readonly canViewAudit = computed(() => this.auth.can('members:update'));

  private readonly requestedTab = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('tab') === 'audit' ? 'audit' : 'members'))),
    { initialValue: 'members' as UsersTab },
  );

  readonly activeTab = computed<UsersTab>(() => (this.canViewAudit() ? this.requestedTab() : 'members'));

  select(tab: UsersTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'audit' ? 'audit' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onTabKeydown(event: KeyboardEvent): void {
    const index = TABS.findIndex((tab) => tab.id === this.activeTab());
    const last = TABS.length - 1;
    const next =
      event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    this.select(TABS[next].id);
    this.tabButtons()[next]?.nativeElement.focus();
  }
}
