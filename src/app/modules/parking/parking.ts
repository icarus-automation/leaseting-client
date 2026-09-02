import { Component, ChangeDetectionStrategy } from '@angular/core';

import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-parking',
  imports: [ComingSoon],
  templateUrl: './parking.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Parking {
  readonly features = [
    'Current parking occupancy and space availability by property',
    'Vehicles currently parked, with entry time and elapsed stay',
    'Review guard-recorded activity and void incorrect entries',
    'Revenue trends, peak hours, and parking reports',
  ];
}

