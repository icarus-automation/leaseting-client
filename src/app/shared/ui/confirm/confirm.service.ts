import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
  header: string;
  message: string;
  acceptLabel: string;
  rejectLabel?: string;
  onAccept: () => void;
}

/**
 * PrimeNG's `icon` option renders a blank 2rem box here: icons are SVG
 * components and the primeicons font is never loaded.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly confirmation = inject(ConfirmationService);

  danger(options: ConfirmOptions): void {
    this.open(options, 'danger');
  }

  proceed(options: ConfirmOptions): void {
    this.open(options, undefined);
  }

  private open(options: ConfirmOptions, severity: 'danger' | undefined): void {
    this.confirmation.confirm({
      header: options.header,
      message: options.message,
      acceptButtonProps: { label: options.acceptLabel, severity },
      rejectButtonProps: { label: options.rejectLabel ?? 'Cancel', severity: 'secondary', outlined: true },
      accept: options.onAccept,
    });
  }
}
