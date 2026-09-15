import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';
import type { PortalAccessStatus } from '../../../core/models/portal-access.types';

export const ONE_TIME_PASSWORD_WARNING =
  'It will not be shown again after you leave this page. The tenant must change it on first sign-in.';

export function portalAccessBadge(status: PortalAccessStatus): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'INACTIVE':
      return { label: 'Inactive', tone: 'neutral' };
    case 'ACTIVE':
      return { label: 'Active', tone: 'success' };
    case 'DISABLED':
      return { label: 'Disabled', tone: 'destructive' };
    case 'MUST_CHANGE_PASSWORD':
      // Deliberately short: this chip shares a narrow card header with the
      // "Residence Care" heading, and a sentence-length label wraps to three
      // lines there. The card's own panel spells out what the tenant must do.
      return { label: 'Password pending', tone: 'warning' };
  }
}

/** One-time passwords exist only on the activate/reset response body. */
export function visibleOneTimePassword(temporaryPassword: string | undefined | null): string | null {
  return temporaryPassword?.length ? temporaryPassword : null;
}
