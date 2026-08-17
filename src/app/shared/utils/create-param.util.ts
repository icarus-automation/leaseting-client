import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Watches `?create=1` deep links (command palette, dashboard quick actions):
 * opens the page's create dialog, then strips the param so refresh/back don't
 * reopen it. Subscribed (not snapshot) so it also fires when the user is
 * already on the page. Must be called from an injection context.
 */
export function watchCreateParam(open: () => void): void {
  const route = inject(ActivatedRoute);
  const router = inject(Router);

  route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
    if (!params.get('create')) return;
    open();
    void router.navigate([], {
      relativeTo: route,
      queryParams: { create: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });
}
