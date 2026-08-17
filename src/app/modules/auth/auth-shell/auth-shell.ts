import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';

import { BrandLogo } from '../../../shared/ui/brand-logo/brand-logo';
import {
  KIT_SEVERITY_ICONS,
  KIT_SEVERITY_LABELS,
  type KitSeverity,
} from '../../../core/kit/kit.model';

/** One illustrative row in the "what Kit watches" ledger. */
interface WatchExample {
  readonly severity: KitSeverity;
  readonly headline: string;
  /** Rendered with tabular figures beside the headline; omitted when there is none. */
  readonly amount: string | null;
  readonly detail: string;
}

/**
 * Shared chrome for the auth flow, composed as the morning brief a property
 * manager is about to walk into: masthead, dateline, the ledger of what Kit
 * watches while nobody is logged in, and the sign-in card as the page's one
 * pure-white surface. Pages project their form through `<ng-content>`, so
 * every auth screen shares one layout and the flow feels continuous.
 *
 * Light, like every other surface in this product. The sheet sits on Panel
 * Surface and the card steps up to white, so the action is the brightest thing
 * on screen without introducing a second palette.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [BrandLogo, DatePipe, PIcon],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShell {
  /** Read once at construction; the dateline never needs to tick. */
  readonly today = signal(new Date());

  readonly severityLabels = KIT_SEVERITY_LABELS;
  readonly severityIcons = KIT_SEVERITY_ICONS;

  /**
   * Illustrative, and labelled as such in the template. Nobody is signed in
   * yet, so a returning manager must never be able to read these as their own
   * portfolio. The three rows are exactly the three `KitEventType`s the
   * backend raises, so the example cannot drift from what the product does.
   */
  readonly watchExamples: readonly WatchExample[] = [
    {
      severity: 'URGENT',
      headline: 'Rent overdue',
      amount: '₱18,500',
      detail: 'Unit 4B · Sunrise Residences · 6 days late',
    },
    {
      severity: 'WARNING',
      headline: 'Lease expiring',
      amount: null,
      detail: 'Unit 12A · Bayview Court · 24 days left',
    },
    {
      severity: 'INFO',
      headline: 'Unit vacant',
      amount: null,
      detail: 'Unit 2C · Sunrise Residences · 31 days empty',
    },
  ];

  /**
   * The app's own severity chips, matched to `kit-card`'s map so the preview
   * cannot drift from the thing it previews. INFO takes the white ground
   * rather than Panel Surface, because the sheet itself is Panel Surface and a
   * surface-on-surface chip would have no edge.
   */
  readonly severityChip: Record<KitSeverity, string> = {
    URGENT:
      'border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-muted-destructive text-destructive',
    WARNING:
      'border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-muted-warning text-body',
    INFO: 'border-border bg-background text-muted',
  };
}
