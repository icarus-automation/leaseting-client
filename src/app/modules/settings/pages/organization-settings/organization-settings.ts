import { ChangeDetectionStrategy, Component } from '@angular/core';

import { OrganizationSettings } from '../../components/organization-settings/organization-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-organization-settings-page',
  imports: [SettingsPageShell, OrganizationSettings],
  template: `
    <app-settings-page-shell section="organization">
      <app-organization-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSettingsPage {}
