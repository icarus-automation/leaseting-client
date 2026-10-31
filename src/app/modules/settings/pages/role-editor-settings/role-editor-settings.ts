import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RoleWorkspace } from '../../components/role-workspace/role-workspace';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-role-editor-settings-page',
  imports: [SettingsPageShell, RoleWorkspace],
  template: `
    <app-settings-page-shell section="roles">
      <app-role-workspace />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleEditorSettingsPage {}
