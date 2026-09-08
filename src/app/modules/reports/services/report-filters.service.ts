import { Injectable, inject, signal } from '@angular/core';

import { PropertiesService } from '../../properties/services/properties.service';
import { ParkingTerminalsService } from '../../settings/services/parking-terminals.service';

export interface PropertyOption {
  value: string;
  label: string;
}

/** A gate, with the property it stands at, so two "Basement" read apart. */
export interface TerminalOption extends PropertyOption {
  propertyId: string;
}

/** Sentinel for "no property filter" — an empty string, so it is falsy. */
export const ALL_PROPERTIES = '';

/** Same sentinel, for the gate picker on the parking reports. */
export const ALL_TERMINALS = '';

const ALL_OPTION: PropertyOption = { value: ALL_PROPERTIES, label: 'All properties' };

const ALL_TERMINALS_OPTION: TerminalOption = {
  value: ALL_TERMINALS,
  label: 'All gates',
  propertyId: '',
};

/** The largest page the API will serve. Asking for more is a 400. */
const PROPERTY_PAGE_LIMIT = 50;

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
  private readonly terminals = inject(ParkingTerminalsService);
  private loading = false;
  private loadingTerminals = false;

  readonly propertyOptions = signal<PropertyOption[]>([ALL_OPTION]);

  /** Only the parking reports ask for these, so they load on demand. */
  readonly terminalOptions = signal<TerminalOption[]>([ALL_TERMINALS_OPTION]);

  ensureProperties(): void {
    if (this.loading || this.propertyOptions().length > 1) return;
    this.loading = true;

    // 50 is the API's ceiling on a page. Asking for 100 fails validation, and
    // because a failed load falls back to "All properties" the picker went
    // quietly empty on every report rather than reporting anything.
    this.properties.list(1, PROPERTY_PAGE_LIMIT).subscribe({
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

  /**
   * Every gate, including the ones switched off in Settings.
   *
   * A disabled terminal is hidden from the handheld's picker but keeps every
   * exit it ever took, and a report that quietly dropped those would be missing
   * cash that was genuinely collected.
   */
  ensureTerminals(): void {
    if (this.loadingTerminals || this.terminalOptions().length > 1) return;
    this.loadingTerminals = true;

    this.terminals.list().subscribe({
      next: (terminals) => {
        this.terminalOptions.set([
          ALL_TERMINALS_OPTION,
          ...terminals.map((terminal) => ({
            value: terminal.id,
            label: `${terminal.name} · ${terminal.propertyName}`,
            propertyId: terminal.propertyId,
          })),
        ]);
        this.loadingTerminals = false;
      },
      error: () => {
        this.loadingTerminals = false;
      },
    });
  }

  labelFor(propertyId: string): string {
    if (!propertyId) return ALL_OPTION.label;
    return this.propertyOptions().find((option) => option.value === propertyId)?.label ?? 'One property';
  }

  terminalLabelFor(terminalId: string): string {
    if (!terminalId) return ALL_TERMINALS_OPTION.label;
    return this.terminalOptions().find((option) => option.value === terminalId)?.label ?? 'One gate';
  }
}
