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
    'Maintenance queue: Open, In progress, Waiting on vendor, Resolved, Closed',
    'Priority and assignee on each work order',
    'Linked to the unit and tenant that raised it',
    'Time to resolve, per property',
  ];
}
