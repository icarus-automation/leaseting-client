import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ParkingRulesSettings } from '../../components/parking-rules-settings/parking-rules-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-parking-rules-settings-page',
  imports: [SettingsPageShell, ParkingRulesSettings],
  template: `
    <app-settings-page-shell section="parking-rules">
      <app-parking-rules-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingRulesSettingsPage {}
