import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of } from 'rxjs';

import { AuthService } from './auth.service';
import { NO_ACCESS_URL, permissionGuard } from './permission.guard';
import type { Permission } from './permissions';

describe('permissionGuard', () => {
  let authenticated: boolean;
  let held: Permission[];

  beforeEach(() => {
    authenticated = true;
    held = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            ensureSession: () => of(authenticated),
            canAll: (codes: readonly Permission[]) => codes.every((code) => held.includes(code)),
          },
        },
      ],
    });
  });

  function run(...codes: [Permission, ...Permission[]]): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard(...codes)({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return firstValueFrom(result as Observable<boolean | UrlTree>);
  }

  function urlOf(result: boolean | UrlTree): string | boolean {
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  }

  it('lets a session holding every code through', async () => {
    held = ['members:view', 'members:update'];

    expect(await run('members:view', 'members:update')).toBe(true);
  });

  it('sends anyone missing a code to the no-access page', async () => {
    held = ['members:view'];

    expect(urlOf(await run('members:view', 'members:update'))).toBe(NO_ACCESS_URL);
  });

  it('sends a signed-out visitor to sign in', async () => {
    authenticated = false;

    expect(urlOf(await run('members:view'))).toBe('/login');
  });
});
