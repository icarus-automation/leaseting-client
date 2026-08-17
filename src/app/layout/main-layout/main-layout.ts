import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs/operators';

import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { NavDrawerService } from '../nav-drawer.service';
import { CommandPalette } from '../../shared/ui/command-palette/command-palette';
import { KitBadge } from '../../shared/ui/kit/kit-badge';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar, Header, CommandPalette, KitBadge],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'drawer.close()',
  },
})
export class MainLayout {
  private readonly router = inject(Router);
  protected readonly drawer = inject(NavDrawerService);

  readonly drawerOpen = this.drawer.open;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /**
   * Hidden where Kit is already present: the dashboard renders him inline and
   * unprompted, and the Ask Kit page *is* him. Either way a floating badge
   * would be the same voice twice on one screen.
   */
  readonly showKitBadge = computed(() => {
    const url = this.url();
    return !url.startsWith('/dashboard') && !url.startsWith('/kit');
  });
}
