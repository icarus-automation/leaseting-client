import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';
import { TeamMembers } from '../../components/team-members/team-members';

@Component({
  selector: 'app-users-settings-page',
  imports: [SettingsPageShell, TeamMembers],
  template: `
    <app-settings-page-shell section="users">
      <app-team-members />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersSettingsPage {}
