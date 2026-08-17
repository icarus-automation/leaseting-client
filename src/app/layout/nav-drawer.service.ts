import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Open state of the mobile navigation drawer.
 *
 * Lives in a service because the button that opens it (header) and the panel
 * it opens (sidebar) are siblings — same reason CommandPaletteService exists.
 * Above the drawer breakpoint the sidebar is always visible and this signal is
 * simply ignored by CSS.
 */
@Injectable({ providedIn: 'root' })
export class NavDrawerService {
  private readonly router = inject(Router);
  private readonly _open = signal(false);

  readonly open = this._open.asReadonly();

  constructor() {
    // Tapping a nav link is an intent to leave the menu, not to keep it open
    // over the page you just asked for.
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this._open.set(false));
  }

  toggle(): void {
    this._open.update((open) => !open);
  }

  close(): void {
    this._open.set(false);
  }
}
