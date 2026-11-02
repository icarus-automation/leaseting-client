import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import type { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Permission } from '../../../../core/auth/permissions';

type BillingTool = { readonly label: string; readonly icon: string; readonly permission: Permission } & (
  | { readonly kind: 'route'; readonly route: string }
  | { readonly kind: 'dialog' }
  | { readonly kind: 'job'; readonly job: 'rent' | 'dues' }
);

const BILLING_TOOLS: readonly BillingTool[] = [
  { kind: 'route', label: 'SOA', icon: 'file-excel', route: '/bills/soa', permission: 'soa:view' },
  { kind: 'dialog', label: 'Generate SOA', icon: 'file-export', permission: 'soa:manage' },
  { kind: 'route', label: 'Utility run', icon: 'bolt', route: '/bills/utility-run', permission: 'bills:manage' },
  { kind: 'job', job: 'rent', label: 'Generate rent bills', icon: 'refresh', permission: 'bills:manage' },
  { kind: 'job', job: 'dues', label: 'Generate association dues', icon: 'refresh', permission: 'bills:manage' },
];

@Component({
  selector: 'app-bills-tools-menu',
  imports: [RouterLink, PIcon, Menu],
  templateUrl: './bills-tools-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
})
export class BillsToolsMenu {
  private readonly auth = inject(AuthService);

  readonly generatingRent = input(false);
  readonly generatingDues = input(false);
  readonly generateSoa = output<void>();
  readonly rentRun = output<void>();
  readonly duesRun = output<void>();

  readonly menu = viewChild<Menu>('menu');
  readonly open = signal(false);

  readonly items = computed((): MenuItem[] => {
    return BILLING_TOOLS.filter((tool) => this.auth.can(tool.permission)).map((tool) => {
      if (tool.kind === 'route') {
        return { label: tool.label, routerLink: tool.route, state: { icon: tool.icon } };
      }
      if (tool.kind === 'dialog') {
        return {
          label: tool.label,
          state: { icon: tool.icon },
          command: () => this.generateSoa.emit(),
        };
      }
      return {
        label: tool.label,
        state: { icon: tool.icon },
        disabled: tool.job === 'rent' ? this.generatingRent() : this.generatingDues(),
        command: () => tool.job === 'rent' ? this.rentRun.emit() : this.duesRun.emit(),
      };
    });
  });

  toggle(event: Event): void {
    this.menu()?.toggle(event);
  }

  iconOf(item: MenuItem): string {
    const icon = item.state?.['icon'];
    return typeof icon === 'string' ? icon : '';
  }
}
