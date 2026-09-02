import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ParkingAttendantSettings } from '../../components/parking-attendant-settings/parking-attendant-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-parking-attendants-settings-page',
  imports: [SettingsPageShell, ParkingAttendantSettings],
  template: `
    <app-settings-page-shell section="parking-attendants">
      <app-parking-attendant-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingAttendantsSettingsPage {}
