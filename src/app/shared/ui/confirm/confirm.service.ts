import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
  /** Names the action in the title bar, e.g. "Delete bill", "Archive tenant". */
  header: string;
  /** One or two sentences: what happens, and what survives it. */
  message: string;
  /** Label on the button that goes through with it, e.g. "Delete", "Archive". */
  acceptLabel: string;
  /** Defaults to "Cancel"; override only when the wording needs it. */
  rejectLabel?: string;
  onAccept: () => void;
}

/**
 * The single way this app asks "are you sure?".
 *
 * Every delete, archive, discard, and sign-off used to hand PrimeNG its own
 * copy of the same four option objects, which is how they drifted: some passed
 * an `icon`, some didn't, and the ones that did rendered a blank 2rem box
 * (icons here are SVG components, the primeicons font is never loaded) that
 * shoved the message out of line with its own heading by a different amount in
 * every dialog. Funnelling them through one call site means the shape is
 * decided once, and a new confirm cannot reintroduce the drift.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly confirmation = inject(ConfirmationService);

  /** Destructive or irreversible: delete, archive, end, discard. Red accept. */
  danger(options: ConfirmOptions): void {
    this.open(options, 'danger');
  }

  /** Reversible but worth a beat: send an SMS, sign off a shift. Primary accept. */
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
