import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, viewChild } from '@angular/core';

import { AuthService } from '../../../../core/auth/auth.service';
import type { BillListItem } from '../../../../core/models/bill.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { paymentTargetFromRow, type PaymentTarget } from '../payment-workspace/payment-target';
import { PaymentWorkspace } from '../payment-workspace/payment-workspace';

@Component({
  selector: 'app-record-payment-dialog',
  imports: [FormDialog, PaymentWorkspace],
  templateUrl: './record-payment-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordPaymentDialog {
  private readonly auth = inject(AuthService);

  readonly visible = model.required<boolean>();
  readonly bill = input<BillListItem | null>(null);
  readonly changed = output<void>();

  readonly workspace = viewChild(PaymentWorkspace);
  readonly canMutate = this.auth.isFinancialAdmin;

  readonly heading = computed(() => {
    const bill = this.bill();
    const verb = this.canMutate() ? 'Record payment' : 'Payments';
    if (!bill) return verb;
    return `${verb} · ${BILL_TYPE_LABELS[bill.type]}`;
  });
  readonly subheading = computed(() => {
    const bill = this.bill();
    if (!bill) return null;
    const tenant = bill.lease.tenant;
    return `${tenant.firstName} ${tenant.lastName} · Unit ${bill.lease.unit.unitNo}`;
  });
  readonly target = computed<PaymentTarget | null>(() => {
    const bill = this.bill();
    return bill ? paymentTargetFromRow(bill) : null;
  });
}
