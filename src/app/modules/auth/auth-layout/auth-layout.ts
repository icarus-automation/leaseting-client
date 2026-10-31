import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { map } from 'rxjs';

/** Tailwind's `md` breakpoint: the image panel shows from here up. */
const PANEL_QUERY = '(min-width: 48rem)';

/**
 * The frame the signed-out pages share: a narrow image panel down the left of
 * a wide screen (a quarter of the width, 280–360px), and the page's content
 * centered on a plain ground beside it. Phones get the content alone.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [NgOptimizedImage],
  host: { class: 'flex min-h-dvh bg-background' },
  template: `
    <div
      class="sticky top-0 hidden h-dvh w-1/4 min-w-[280px] max-w-[360px] shrink-0 overflow-hidden bg-auth-panel md:block"
    >
      @if (showPanel()) {
        <img class="object-cover object-center" [ngSrc]="image()" fill priority alt="" />
      }
    </div>

    <main class="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
      <div class="w-full max-w-sm">
        <ng-content />
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayout {
  /** The panel art: a tall, decorative image under `src/assets/`, e.g. `/assets/auth/login-panel.webp`. */
  readonly image = input.required<string>();

  /**
   * CSS already hides the panel on phones. Leaving the `<img>` out too keeps
   * phones from downloading art they never show.
   */
  readonly showPanel = toSignal(
    inject(BreakpointObserver)
      .observe(PANEL_QUERY)
      .pipe(map((state) => state.matches)),
    { requireSync: true },
  );
}
