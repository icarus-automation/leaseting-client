import { inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
