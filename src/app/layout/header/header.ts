import { Component, ChangeDetectionStrategy, DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { ConfirmationService } from 'primeng/api';

import { AuthService } from '../../core/auth/auth.service';
import { NavDrawerService } from '../nav-drawer.service';
import { CommandPaletteService } from '../../shared/ui/command-palette/command-palette.service';
import { BrandLogo } from '../../shared/ui/brand-logo/brand-logo';

@Component({
  selector: 'app-header',
  imports: [PIcon, RouterLink, BrandLogo],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly palette = inject(CommandPaletteService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly drawer = inject(NavDrawerService);

  readonly user = this.auth.currentUser;
  readonly organization = this.auth.activeOrganization;
  readonly drawerOpen = this.drawer.open;

  readonly initials = computed(() => {
    const name = this.user()?.name?.trim();
    if (!name) return '·';
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
    return (first + last).toUpperCase() || '·';
  });

  openPalette(): void {
    this.palette.show();
  }

  toggleDrawer(): void {
    this.drawer.toggle();
  }

  signOut(): void {
    this.confirmation.confirm({
      header: 'Sign out',
      message: 'You\'ll need to sign in again to continue.',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Sign out', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.auth
          .signOut()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => void this.router.navigateByUrl('/login'));
      },
    });
  }
}
