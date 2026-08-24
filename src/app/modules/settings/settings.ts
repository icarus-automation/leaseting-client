import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { SETTINGS_GROUPS } from './settings-nav';

/** Settings index: grouped cards, one per configurable area. */
@Component({
  selector: 'app-settings',
  imports: [RouterLink, PIcon],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  readonly groups = SETTINGS_GROUPS;
}
