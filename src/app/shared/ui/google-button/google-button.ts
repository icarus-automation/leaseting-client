import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

/** Google's own sign-in look: white, the color "G", and the label beside it. */
@Component({
  selector: 'app-google-button',
  imports: [NgOptimizedImage],
  host: { class: 'block' },
  template: `
    <button
      type="button"
      class="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-base border border-border bg-background px-4 text-sm font-medium text-heading transition-[border-color,background-color] duration-150 ease-out enabled:hover:border-border-strong enabled:hover:bg-surface disabled:cursor-not-allowed disabled:opacity-[0.65] motion-reduce:transition-none"
      [disabled]="disabled() || loading()"
      [attr.aria-busy]="loading() ? 'true' : null"
      (click)="pressed.emit()"
    >
      @if (loading()) {
        <span
          class="h-[15px] w-[15px] rounded-full border-2 border-border border-t-primary animate-spinner motion-reduce:[animation-duration:1300ms]"
          aria-hidden="true"
        ></span>
        <span>Opening Google…</span>
      } @else {
        <img ngSrc="/brand/google-g.svg" width="18" height="18" alt="" aria-hidden="true" />
        <span>{{ label() }}</span>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleButton {
  readonly label = input('Continue with Google');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly pressed = output<void>();
}
