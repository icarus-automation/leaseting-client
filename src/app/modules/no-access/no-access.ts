import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-no-access',
  imports: [RouterLink, PIcon],
  template: `
    <section
      class="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 py-12 text-center"
      aria-labelledby="no-access-heading"
    >
      <span class="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted">
        <svg pIcon="lock" [size]="18" aria-hidden="true"></svg>
      </span>
      <h1 id="no-access-heading" class="font-heading text-2xl font-semibold text-heading">
        You don't have access to this page
      </h1>
      <p class="max-w-[46ch] text-[14px] leading-relaxed text-muted">
        @if (roleName(); as role) {
          Your role, <span class="font-medium text-body">{{ role }}</span>, doesn't include it.
        } @else {
          Your role doesn't include it.
        }
        Ask an owner or an admin if you need access.
      </p>
      <a
        routerLink="/dashboard"
        class="mt-2 inline-flex h-9 items-center rounded-base bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground no-underline transition-colors duration-150 ease-out hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring motion-reduce:transition-none"
      >
        Go to Dashboard
      </a>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoAccess {
  private readonly auth = inject(AuthService);

  readonly roleName = computed(() => this.auth.currentUser()?.organizationRoleName ?? null);
}
