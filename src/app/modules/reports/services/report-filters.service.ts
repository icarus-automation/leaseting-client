import { Injectable, inject, signal } from '@angular/core';

import { PropertiesService } from '../../properties/services/properties.service';

export interface PropertyOption {
  value: string;
  label: string;
}

/** Sentinel for "no property filter" — an empty string, so it is falsy. */
export const ALL_PROPERTIES = '';

const ALL_OPTION: PropertyOption = { value: ALL_PROPERTIES, label: 'All properties' };

/**
 * The property picker shared by every report.
 *
 * Loaded once per session and held here rather than re-fetched by each report:
 * four report pages offering the same filter should not make four requests, and
 * moving between them should not blank the control they were just using.
 *
 * A failed load narrows the filter to "All properties" instead of surfacing an
 * error — the picker is a convenience, and the figures it would have narrowed
 * are the point of the page.
 */
@Injectable({ providedIn: 'root' })
export class ReportFiltersService {
  private readonly properties = inject(PropertiesService);
  private loading = false;

  readonly propertyOptions = signal<PropertyOption[]>([ALL_OPTION]);

  ensureProperties(): void {
    if (this.loading || this.propertyOptions().length > 1) return;
    this.loading = true;

    this.properties.list(1, 100).subscribe({
      next: (result) => {
        this.propertyOptions.set([
          ALL_OPTION,
          ...result.data.map((property) => ({ value: property.id, label: property.name })),
        ]);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  labelFor(propertyId: string): string {
    if (!propertyId) return ALL_OPTION.label;
    return this.propertyOptions().find((option) => option.value === propertyId)?.label ?? 'One property';
  }
}
