import { ChangeDetectionStrategy, Component, computed, inject, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import type { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Permission } from '../../../../core/auth/permissions';

/** What the Bills page opens for a Generate item that isn't a page of its own. */
export type GenerateAction = 'rent' | 'dues' | 'soa';

type GenerateItem = { readonly label: string; readonly icon: string; readonly permission: Permission } & (
  | { readonly kind: 'route'; readonly route: string }
  | { readonly kind: 'action'; readonly action: GenerateAction }
);

/** One icon each: a meter for readings, a key for rent, the association's building, and the statement. */
export const GENERATE_ITEMS: readonly GenerateItem[] = [
  { kind: 'route', label: 'Utility run', icon: 'gauge', route: '/bills/utility-run', permission: 'bills:manage' },
  { kind: 'action', action: 'rent', label: 'Rent bills', icon: 'key', permission: 'bills:manage' },
  { kind: 'action', action: 'dues', label: 'Association dues', icon: 'building-columns', permission: 'bills:manage' },
  { kind: 'action', action: 'soa', label: 'Statement of account', icon: 'receipt', permission: 'soa:manage' },
];

@Component({
  selector: 'app-generate-menu',
  imports: [RouterLink, PIcon, Menu],
  templateUrl: './generate-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
})
export class GenerateMenu {
  private readonly auth = inject(AuthService);

  readonly generate = output<GenerateAction>();

  readonly menu = viewChild<Menu>('menu');
  readonly open = signal(false);

  readonly items = computed((): MenuItem[] =>
    GENERATE_ITEMS.filter((item) => this.auth.can(item.permission)).map((item) =>
      item.kind === 'route'
        ? { label: item.label, routerLink: item.route, state: { icon: item.icon } }
        : { label: item.label, state: { icon: item.icon }, command: () => this.generate.emit(item.action) },
    ),
  );

  toggle(event: Event): void {
    this.menu()?.toggle(event);
  }

  iconOf(item: MenuItem): string {
    const icon = item.state?.['icon'];
    return typeof icon === 'string' ? icon : '';
  }
}
