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
    'Spot inventory: Available · Assigned · Reserved · Out of Service',
    'Assignments tied to units and leases',
    'Flags occupied units without an assigned spot',
    'Utilization reporting per property',
  ];
}
