import { ChangeDetectionStrategy, Component } from '@angular/core';

import { LateFeeSettings } from '../../components/late-fee-settings/late-fee-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-late-fee-settings-page',
  imports: [SettingsPageShell, LateFeeSettings],
  template: `
    <app-settings-page-shell section="late-fees">
      <app-late-fee-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateFeeSettingsPage {}
