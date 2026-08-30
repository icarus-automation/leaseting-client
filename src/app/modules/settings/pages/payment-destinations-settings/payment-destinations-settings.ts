import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';
import { PaymentDestinationSettings } from '../../components/payment-destination-settings/payment-destination-settings';

@Component({
  selector: 'app-payment-destinations-settings-page',
  imports: [SettingsPageShell, PaymentDestinationSettings],
  template: `
    <app-settings-page-shell section="payment-destinations">
      <app-payment-destination-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDestinationsSettingsPage {}
