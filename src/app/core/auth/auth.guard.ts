import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

/** Blocks the app shell until the cookie session is confirmed (or bounces to login). */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .ensureSession()
    .pipe(map((authenticated) => (authenticated ? true : router.parseUrl('/login'))));
};

/** Keeps signed-in users out of the login screen. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .ensureSession()
    .pipe(map((authenticated) => (authenticated ? router.parseUrl('/dashboard') : true)));
};
