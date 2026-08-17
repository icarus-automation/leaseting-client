import { Component, ChangeDetectionStrategy } from '@angular/core';

import { ComingSoon } from '../../shared/ui/coming-soon/coming-soon';

@Component({
  selector: 'app-work-orders',
  imports: [ComingSoon],
  templateUrl: './work-orders.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkOrders {
  readonly features = [
    'Maintenance queue: Open · In Progress · Waiting on Vendor · Resolved · Closed',
    'Priority levels with assignee tracking',
    'Requests linked to the unit and tenant that raised them',
    'Resolution-time measurement per property',
  ];
}
