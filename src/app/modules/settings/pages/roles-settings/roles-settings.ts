import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RolesDirectory } from '../../components/roles-directory/roles-directory';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-roles-settings-page',
  imports: [SettingsPageShell, RolesDirectory],
  template: `
    <app-settings-page-shell section="roles">
      <app-roles-directory />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesSettingsPage {}
