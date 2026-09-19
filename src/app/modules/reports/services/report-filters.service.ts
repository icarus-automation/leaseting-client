import { Injectable, inject, signal } from '@angular/core';

import { PropertiesService } from '../../properties/services/properties.service';
import { ParkingTerminalsService } from '../../settings/services/parking-terminals.service';

export interface PropertyOption {
  value: string;
  label: string;
}

export interface TerminalOption extends PropertyOption {
  propertyId: string;
}

export const ALL_PROPERTIES = '';

export const ALL_TERMINALS = '';

const ALL_OPTION: PropertyOption = { value: ALL_PROPERTIES, label: 'All properties' };

const ALL_TERMINALS_OPTION: TerminalOption = {
  value: ALL_TERMINALS,
  label: 'All gates',
  propertyId: '',
};

const PROPERTY_PAGE_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class ReportFiltersService {
  private readonly properties = inject(PropertiesService);
  private readonly terminals = inject(ParkingTerminalsService);
  private loading = false;
  private loadingTerminals = false;

  readonly propertyOptions = signal<PropertyOption[]>([ALL_OPTION]);

  readonly terminalOptions = signal<TerminalOption[]>([ALL_TERMINALS_OPTION]);

  ensureProperties(): void {
    if (this.loading || this.propertyOptions().length > 1) return;
    this.loading = true;

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
