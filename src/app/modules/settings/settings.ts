import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { AuthService } from '../../core/auth/auth.service';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { visibleSettingsGroups } from './settings-nav';

@Component({
  selector: 'app-settings',
  imports: [RouterLink, PIcon, EmptyState],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly auth = inject(AuthService);

  readonly groups = computed(() => visibleSettingsGroups((code) => this.auth.can(code)));
}
