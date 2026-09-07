import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { findSettingsCard, settingsSetupSteps } from '../../settings-nav';

/**
 * Chrome shared by every Settings detail page: breadcrumb back to the index
 * plus the title and blurb the hub card already promised, read from the same
 * SETTINGS_GROUPS entry so the two can never drift apart. Title, blurb, setup
 * chain, and the page card share the standard Settings column — no narrower
 * copy column inside it.
 */
@Component({
  selector: 'app-settings-page-shell',
  imports: [RouterLink, PIcon],
  template: `
    <div class="flex w-full flex-col gap-6">
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
          <p class="text-[13px] leading-relaxed text-muted">{{ details.description }}</p>
        }
        @if (setupSteps(); as steps) {
          <nav class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px]" aria-label="Setup order">
            @for (step of steps; track step.route; let last = $last) {
              @if (step.route === section()) {
                <span class="font-medium text-heading">{{ step.label }}</span>
              } @else {
                <a
                  [routerLink]="['/settings', step.route]"
                  class="font-medium text-primary transition-colors duration-150 ease-out hover:underline motion-reduce:transition-none"
                >
                  {{ step.label }}
                </a>
              }
              @if (!last) {
                <svg pIcon="chevron-right" class="text-muted" [size]="10" aria-hidden="true"></svg>
              }
            }
          </nav>
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

  readonly card = computed(() => findSettingsCard(this.section()));
  readonly setupSteps = computed(() => settingsSetupSteps(this.section()));
}
