import { ChangeDetectionStrategy, Component } from '@angular/core';

import { BrandLogo } from '../../../shared/ui/brand-logo/brand-logo';

/**
 * Shared chrome for the auth flow: the drenched deep-slate brand panel (desktop)
 * plus the centered form panel with the mobile logo. Pages project their own
 * header/form/content through `<ng-content>`, so every auth screen shares one
 * layout and the flow feels continuous.
 */
@Component({
  selector: 'app-auth-shell',
  imports: [BrandLogo],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShell {}
