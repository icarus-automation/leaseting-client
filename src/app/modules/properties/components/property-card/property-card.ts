import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import type { PropertyListItem } from '../../../../core/models/property.types';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';

@Component({
  selector: 'app-property-card',
  imports: [RouterLink, PIcon, StatusBadge],
  templateUrl: './property-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyCard {
  readonly property = input.required<PropertyListItem>();
  readonly edit = output<void>();
  readonly archive = output<void>();

  readonly imageFailed = signal(false);
}
