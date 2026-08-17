import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

export type BadgeTone = 'success' | 'destructive' | 'warning' | 'vacant' | 'neutral';

/**
 * Status chip: colored dot + label (+ optional count). Color is never the sole
 * differentiator — the label always names the state (WCAG / design rule).
 */
@Component({
  selector: 'app-status-badge',
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-xs font-medium leading-none"
      [class]="chipClass()"
    >
      <span class="h-1.5 w-1.5 shrink-0 rounded-full" [class]="dotClass()" aria-hidden="true"></span>
      <span class="text-body">{{ label() }}</span>
      @if (count() !== null) {
        <span class="font-semibold text-heading tabular-nums">{{ count() }}</span>
      }
    </span>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly tone = input.required<BadgeTone>();
  readonly label = input.required<string>();
  readonly count = input<number | null>(null);

  readonly chipClass = computed(() => {
    switch (this.tone()) {
      case 'success':
        return 'border-[color-mix(in_oklab,var(--success)_30%,transparent)] bg-muted-success';
      case 'destructive':
        return 'border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-muted-destructive';
      case 'warning':
        return 'border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-muted-warning';
      case 'vacant':
        return 'border-[color-mix(in_oklab,var(--vacant)_30%,transparent)] bg-muted-vacant';
      default:
        return 'border-border bg-background';
    }
  });

  readonly dotClass = computed(() => {
    switch (this.tone()) {
      case 'success':
        return 'bg-success';
      case 'destructive':
        return 'bg-destructive';
      case 'warning':
        return 'bg-warning';
      case 'vacant':
        return 'bg-vacant';
      default:
        return 'border border-border bg-background';
    }
  });
}
