import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';
import { VehicleTypeSettings } from '../../components/vehicle-type-settings/vehicle-type-settings';

@Component({
  selector: 'app-vehicle-types-settings-page',
  imports: [SettingsPageShell, VehicleTypeSettings],
  template: `
    <app-settings-page-shell section="vehicle-types">
      <app-vehicle-type-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VehicleTypesSettingsPage {}
