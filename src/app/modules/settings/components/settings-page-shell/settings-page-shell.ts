import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { findSettingsCard } from '../../settings-nav';

/**
 * Chrome shared by every Settings detail page: breadcrumb back to the index
 * plus the title and blurb the hub card already promised, read from the same
 * SETTINGS_GROUPS entry so the two can never drift apart.
 */
@Component({
  selector: 'app-settings-page-shell',
  imports: [RouterLink, PIcon],
  template: `
    <div
      class="mx-auto flex w-full flex-col gap-6"
      [class.max-w-3xl]="!wide()"
      [class.max-w-4xl]="wide()"
    >
      <div class="flex flex-col gap-1">
        <nav class="flex items-center gap-1.5 text-[12.5px]" aria-label="Breadcrumb">
          <a
            routerLink="/settings"
            class="rounded-[2px] font-medium text-muted transition-colors duration-150 ease-out hover:text-primary hover:underline motion-reduce:transition-none"
          >
            Settings
          </a>
          <svg pIcon="chevron-right" class="text-muted" [size]="10" aria-hidden="true"></svg>
          <span class="font-medium text-heading" aria-current="page">{{ card()?.label ?? section() }}</span>
        </nav>
        <h1 class="font-heading text-2xl font-semibold text-heading">{{ card()?.label ?? section() }}</h1>
        @if (card(); as details) {
          <p class="max-w-[62ch] text-[13px] leading-relaxed text-muted">{{ details.description }}</p>
        }
      </div>

      <ng-content />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageShell {
  /** Child path under /settings — the key into SETTINGS_GROUPS. */
  readonly section = input.required<string>();
  /** Rate plans need a bit more width for the per-type price grid. */
  readonly wide = input(false);

  readonly card = computed(() => findSettingsCard(this.section()));
}
