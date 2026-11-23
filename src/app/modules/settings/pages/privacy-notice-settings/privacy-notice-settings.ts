import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PrivacyNoticeSettings } from '../../components/privacy-notice-settings/privacy-notice-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-privacy-notice-settings-page',
  imports: [SettingsPageShell, PrivacyNoticeSettings],
  template: `
    <app-settings-page-shell section="privacy-notice">
      <app-privacy-notice-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyNoticeSettingsPage {}
