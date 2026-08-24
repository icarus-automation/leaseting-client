import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PropertyTypeSettings } from '../../components/property-type-settings/property-type-settings';
import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';

@Component({
  selector: 'app-property-types-settings-page',
  imports: [SettingsPageShell, PropertyTypeSettings],
  template: `
    <app-settings-page-shell section="property-types">
      <app-property-type-settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyTypesSettingsPage {}
