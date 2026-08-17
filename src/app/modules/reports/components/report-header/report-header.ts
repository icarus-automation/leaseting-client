import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

/**
 * Shared chrome for a single report: breadcrumb back to the catalog, title,
 * and a slot for the report's own toolbar.
 *
 * `caption` is the one line that survives printing — the window and basis the
 * figures were pulled under. A printed report that doesn't say what it covers
 * is a page of numbers nobody can defend in a meeting.
 */
@Component({
  selector: 'app-report-header',
  imports: [RouterLink, PIcon],
  template: `
    <header class="flex flex-col gap-3">
      <nav class="flex items-center gap-1.5 text-[13px] print:hidden" aria-label="Breadcrumb">
        <a
          routerLink="/reports"
          class="rounded-[2px] font-medium text-muted transition-colors duration-150 ease-out hover:text-primary hover:underline motion-reduce:transition-none"
        >
          Reports
        </a>
        <svg pIcon="chevron-right" class="text-muted" [size]="11" aria-hidden="true"></svg>
        <span class="font-medium text-heading" aria-current="page">{{ title() }}</span>
      </nav>

      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="font-heading text-2xl font-semibold text-heading">{{ title() }}</h1>
          <p class="mt-0.5 max-w-[75ch] text-sm text-muted">{{ description() }}</p>
          @if (caption(); as line) {
            <p class="mt-1 hidden text-[13px] font-medium text-body print:block">{{ line }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-2 print:hidden">
          <ng-content />
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportHeader {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  /** Print-only subtitle naming the exact window and basis. */
  readonly caption = input<string | null>(null);
}
