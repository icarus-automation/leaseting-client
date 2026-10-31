import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

import type { PropertyListItem } from '../../../../core/models/property.types';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { MediaThumb } from '../media-thumb/media-thumb';

@Component({
  selector: 'app-property-card',
  imports: [RouterLink, PIcon, StatusBadge, MediaThumb],
  templateUrl: './property-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyCard {
  readonly property = input.required<PropertyListItem>();
  /** Show Edit and Archive: the viewer holds `properties:manage`. */
  readonly manageable = input(true);
  readonly edit = output<void>();
  readonly archive = output<void>();
}
