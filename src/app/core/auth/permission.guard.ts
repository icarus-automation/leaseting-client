import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';
import type { Permission } from './permissions';

export const NO_ACCESS_URL = '/no-access';

/**
 * Opens the route only for a session holding every listed code in the active
 * organization, and sends anyone else to the no-access page. Hiding the link
 * is a convenience; this stops a typed or bookmarked URL from opening a page
 * whose every request would answer 403. The API still checks each call.
 */
export function permissionGuard(...codes: [Permission, ...Permission[]]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.ensureSession().pipe(
      map((authenticated) => {
        if (!authenticated) return router.parseUrl('/login');
        return auth.canAll(codes) ? true : router.parseUrl(NO_ACCESS_URL);
      }),
    );
  };
}
