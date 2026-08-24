import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ChargeItemSettings } from '../../components/charge-item-settings/charge-item-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-charge-items-settings-page',
  imports: [SettingsPageShell, ChargeItemSettings],
  template: `
    <app-settings-page-shell section="charge-items">
      <app-charge-item-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChargeItemsSettingsPage {}
