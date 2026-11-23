import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

/**
 * On the tenant profile once the tenant deleted their Residence Care account:
 * when, that their records stayed, and where staff give them a new login.
 */
@Component({
  selector: 'app-resident-app-account-notice',
  imports: [DatePipe, RouterLink, PIcon],
  host: { class: 'block' },
  template: `
    <section class="flex flex-col gap-1.5 border-t border-border pt-3" aria-labelledby="app-account-heading">
      <h2 id="app-account-heading" class="m-0 text-[12.5px] font-medium text-muted">Residence Care</h2>
      <p class="m-0 flex items-center gap-2 text-[13px] font-medium text-heading">
        <svg pIcon="user-minus" class="shrink-0 text-muted" [size]="13" aria-hidden="true"></svg>
        <span>App account deleted by tenant</span>
      </p>
      <p class="m-0 text-[12.5px] leading-relaxed text-muted">
        On <time [attr.datetime]="deletedAt()">{{ deletedAt() | date: 'MMM d, y' }}</time>. Their lease, bills, and
        records stay here.
        @if (canGiveLogin()) {
          Give them a new login from
          <a
            routerLink="/settings/users"
            [queryParams]="{ audience: 'residents' }"
            class="rounded-[2px] font-medium text-primary hover:underline"
          >Users, Tenants</a>.
        }
      </p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResidentAppAccountNotice {
  /** When the tenant deleted it (ISO). */
  readonly deletedAt = input.required<string>();
  /** Whether this staff member can open the Users page and set a tenant login up. */
  readonly canGiveLogin = input(false);
}
