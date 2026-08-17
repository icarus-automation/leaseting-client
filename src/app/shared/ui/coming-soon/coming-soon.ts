import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

/**
 * Honest placeholder for modules whose backend isn't wired yet: names the
 * page, shows what it will do, and points at what works today. No fake data,
 * no dead controls.
 */
@Component({
  selector: 'app-coming-soon',
  imports: [PIcon],
  template: `
    <div class="flex flex-col gap-5">
      <header>
        <div class="flex items-center gap-2.5">
          <h1 class="font-heading text-2xl font-semibold text-heading">{{ title() }}</h1>
          <span class="rounded-full border border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] bg-surface px-2 py-[3px] text-[11.5px] font-medium text-primary">
            Planned
          </span>
        </div>
        <p class="mt-0.5 max-w-[70ch] text-sm text-muted">{{ description() }}</p>
      </header>

      <section class="rounded-base border border-dashed border-border bg-background p-6" aria-label="Planned capabilities">
        <div class="flex items-start gap-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
            <svg [pIcon]="icon()" [size]="18" aria-hidden="true"></svg>
          </div>
          <div class="flex flex-col gap-3">
            <p class="text-[13.5px] font-medium text-heading">This module ships in a later milestone. It will cover:</p>
            <ul class="grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
              @for (feature of features(); track feature) {
                <li class="flex items-start gap-2 text-[13px] leading-relaxed text-body">
                  <svg pIcon="check" class="mt-1 shrink-0 text-success" [size]="12" aria-hidden="true"></svg>
                  <span>{{ feature }}</span>
                </li>
              }
            </ul>
            <p class="text-[12.5px] text-muted">
              Until then, everything under <span class="font-medium text-body">Management</span> — properties, tenants, leases, and bills — is live.
            </p>
          </div>
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoon {
  readonly icon = input('clock');
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly features = input.required<string[]>();
}
