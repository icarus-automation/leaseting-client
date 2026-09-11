import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import type { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';

type BillingTool =
  | { readonly kind: 'route'; readonly label: string; readonly icon: string; readonly route: string }
  | { readonly kind: 'dialog'; readonly label: string; readonly icon: string }
  | { readonly kind: 'job'; readonly label: string; readonly icon: string };

const BILLING_TOOLS: readonly BillingTool[] = [
  { kind: 'route', label: 'SOA', icon: 'file-excel', route: '/bills/soa' },
  { kind: 'dialog', label: 'Generate SOA', icon: 'file-export' },
  { kind: 'route', label: 'Utility run', icon: 'bolt', route: '/bills/utility-run' },
  { kind: 'job', label: 'Generate rent bills', icon: 'refresh' },
];

@Component({
  selector: 'app-bills-tools-menu',
  imports: [RouterLink, PIcon, Menu],
  templateUrl: './bills-tools-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center' },
})
export class BillsToolsMenu {
  readonly generatingRent = input(false);
  readonly generateSoa = output<void>();
  readonly rentRun = output<void>();

  readonly menu = viewChild.required<Menu>('menu');
  readonly open = signal(false);

  readonly items = computed((): MenuItem[] => {
    const rentRunning = this.generatingRent();
    return BILLING_TOOLS.map((tool) => {
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
        disabled: rentRunning,
        command: () => this.rentRun.emit(),
      };
    });
  });

  toggle(event: Event): void {
    this.menu().toggle(event);
  }

  iconOf(item: MenuItem): string {
    const icon = item.state?.['icon'];
    return typeof icon === 'string' ? icon : '';
  }
}
