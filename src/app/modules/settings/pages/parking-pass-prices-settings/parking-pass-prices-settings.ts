import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ParkingPassPriceSettings } from '../../components/parking-pass-price-settings/parking-pass-price-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-parking-pass-prices-settings-page',
  imports: [SettingsPageShell, ParkingPassPriceSettings],
  template: `
    <app-settings-page-shell section="parking-pass-prices">
      <app-parking-pass-price-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParkingPassPricesSettingsPage {}
