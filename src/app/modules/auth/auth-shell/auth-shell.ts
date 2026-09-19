import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { PIcon } from '@primeicons/angular/p-icon';

import { BrandLogo } from '../../../shared/ui/brand-logo/brand-logo';
import {
  KIT_SEVERITY_ICONS,
  KIT_SEVERITY_LABELS,
  type KitSeverity,
} from '../../../core/kit/kit.model';

interface WatchExample {
  readonly severity: KitSeverity;
  readonly headline: string;
  readonly amount: string | null;
  readonly detail: string;
}

@Component({
  selector: 'app-auth-shell',
  imports: [BrandLogo, DatePipe, PIcon],
  templateUrl: './auth-shell.html',
  styleUrl: './auth-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShell {
  readonly today = signal(new Date());

  readonly severityLabels = KIT_SEVERITY_LABELS;
  readonly severityIcons = KIT_SEVERITY_ICONS;

  readonly watchExamples: readonly WatchExample[] = [
    {
      severity: 'URGENT',
      headline: 'Rent overdue',
      amount: '₱18,500',
      detail: 'Unit 4B · Sunrise Residences · 6 days overdue',
    },
    {
      severity: 'WARNING',
      headline: 'Lease expiring',
      amount: null,
      detail: 'Unit 12A · Bayview Court · 24 days left',
    },
    {
      severity: 'INFO',
      headline: 'Unit vacant',
      amount: null,
      detail: 'Unit 2C · Sunrise Residences · 31 days vacant',
    },
  ];

  readonly severityChip: Record<KitSeverity, string> = {
    URGENT:
      'border-[color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-muted-destructive text-destructive',
    WARNING:
      'border-[color-mix(in_oklab,var(--warning)_35%,transparent)] bg-muted-warning text-body',
    INFO: 'border-border bg-background text-muted',
  };
}
