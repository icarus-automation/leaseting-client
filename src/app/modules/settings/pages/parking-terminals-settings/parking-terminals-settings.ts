import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ParkingTerminalSettings } from '../../components/parking-terminal-settings/parking-terminal-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-parking-terminals-settings-page',
  imports: [SettingsPageShell, ParkingTerminalSettings],
  template: `
    <app-settings-page-shell section="parking-terminals">
      <app-parking-terminal-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingTerminalsSettingsPage {}
