import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PIcon } from '@primeicons/angular/p-icon';

/** The app's standard inline error strip (was copy-pasted across templates). */
@Component({
  selector: 'app-error-banner',
  imports: [PIcon],
  host: { class: 'block' },
  template: `
    <div
      class="flex items-center gap-2 rounded-base border border-[color-mix(in_oklab,var(--destructive)_28%,transparent)] bg-muted-destructive px-3 py-2.5 text-[13px] text-body animate-error-in motion-reduce:animate-none"
      role="alert"
    >
      <svg pIcon="exclamation-circle" class="shrink-0 text-destructive" [size]="16" aria-hidden="true"></svg>
      <span class="flex-1">{{ message() }}</span>
      @if (retryable()) {
        <button type="button" class="shrink-0 rounded-[2px] font-medium text-primary hover:underline" (click)="retry.emit()">
          Retry
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorBanner {
  readonly message = input.required<string>();
  /** Show a Retry action; emits on click. */
  readonly retryable = input(false);
  readonly retry = output<void>();
}
