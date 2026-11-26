import { Component, ChangeDetectionStrategy, computed, effect, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { AuthService } from '../../core/auth/auth.service';
import { PendingPaymentSubmissionsService } from '../../core/payment-submissions/pending-payment-submissions.service';
import { OpenRequestsService } from '../../core/work-orders/open-requests.service';
import { visibleSettingsGroups } from '../../modules/settings/settings-nav';
import { BrandLogo } from '../../shared/ui/brand-logo/brand-logo';
import { navLinkIsActive } from './nav-active.util';
import { NAV_SECTIONS, type NavItem, SETTINGS_NAV } from './nav-sections';

@Component({
  selector: 'app-sidebar',
  imports: [BrandLogo, RouterLink, PIcon],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly openRequests = inject(OpenRequestsService);
  private readonly pendingPaymentSubmissions = inject(PendingPaymentSubmissionsService);

  /** Links the session's permissions open; a section with none left is dropped. */
  readonly sections = computed(() =>
    NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => this.auth.canAll(item.permissions ?? [])),
    })).filter((section) => section.items.length > 0),
  );
  readonly settingsNav = SETTINGS_NAV;
  readonly showSettings = computed(() => visibleSettingsGroups((code) => this.auth.can(code)).length > 0);
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  constructor() {
    effect(() => {
      this.currentUrl();
      const countWorkOrders = this.auth.can('maintenance_requests:view');
      const countSubmissions = this.auth.can('payment_submissions:view');
      untracked(() => {
        if (countWorkOrders) this.openRequests.refresh();
        if (countSubmissions) this.pendingPaymentSubmissions.refresh();
      });
    });
  }

  isActive(route: string): boolean {
    return navLinkIsActive(this.currentUrl(), route);
  }

  countFor(item: NavItem): number | null {
    switch (item.count) {
      case 'openWorkOrders':
        return this.openRequests.count();
      case 'pendingPaymentSubmissions':
        return this.pendingPaymentSubmissions.count();
      default:
        return null;
    }
  }

  countLabel(item: NavItem): string | null {
    const count = this.countFor(item);
    if (!count) return null;
    switch (item.count) {
      case 'openWorkOrders':
        return `${item.label}, ${count} open`;
      case 'pendingPaymentSubmissions':
        return `${item.label}, ${count} pending review`;
      default:
        return null;
    }
  }
}
