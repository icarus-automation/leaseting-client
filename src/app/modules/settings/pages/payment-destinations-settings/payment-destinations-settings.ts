import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

import { SettingsPageShell } from '../../components/settings-page-shell/settings-page-shell';
import { PaymentDestinationSettings } from '../../components/payment-destination-settings/payment-destination-settings';

@Component({
  selector: 'app-payment-destinations-settings-page',
  imports: [PIcon, SettingsPageShell, PaymentDestinationSettings],
  template: `
    <app-settings-page-shell section="payment-destinations">
      @if (settings.canMutate()) {
        <button
          shellActions
          type="button"
          class="inline-flex h-9 shrink-0 items-center gap-2 rounded-base border-none bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 ease-out hover:bg-primary-hover active:bg-primary-active motion-reduce:transition-none"
          (click)="settings.openCreate()"
        >
          <svg pIcon="plus" [size]="13" aria-hidden="true"></svg>
          <span>Add destination</span>
        </button>
      }
      <app-payment-destination-settings #settings />
    </app-settings-page-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDestinationsSettingsPage {}
