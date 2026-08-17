import { Component, ChangeDetectionStrategy } from '@angular/core';

import { PropertyTypeSettings } from './components/property-type-settings/property-type-settings';

@Component({
  selector: 'app-settings',
  imports: [PropertyTypeSettings],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {}
