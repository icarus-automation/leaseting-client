import { ChangeDetectionStrategy, Component } from '@angular/core';

import { RatePlanSettings } from '../../components/rate-plan-settings/rate-plan-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-rate-plans-settings-page',
  imports: [SettingsPageShell, RatePlanSettings],
  template: `
    <app-settings-page-shell section="rate-plans" [wide]="true">
      <app-rate-plan-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatePlansSettingsPage {}
