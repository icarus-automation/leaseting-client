import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, viewChild } from '@angular/core';
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/auth/auth.service';
import type { BillListItem } from '../../../../core/models/bill.types';
import { BILL_TYPE_LABELS } from '../../../../core/models/enums';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { billSourceOf } from '../../../../shared/utils/bill-source.util';
import { paymentTargetFromRow, type PaymentTarget } from '../payment-workspace/payment-target';
import { PaymentWorkspace } from '../payment-workspace/payment-workspace';

@Component({
  selector: 'app-record-payment-dialog',
  imports: [ProgressSpinner, FormDialog, PaymentWorkspace],
  templateUrl: './record-payment-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordPaymentDialog {
  private readonly auth = inject(AuthService);

  readonly visible = model.required<boolean>();
  readonly bill = input<BillListItem | null>(null);
  readonly changed = output<void>();

  readonly workspace = viewChild(PaymentWorkspace);
  readonly canMutate = computed(() => this.auth.can('payments:record'));

  /**
   * A settled bill opens as its payment history. The workspace knows the live balance,
   * so a void that reopens the bill brings recording back; until it renders, the row's
   * status decides.
   */
  readonly canRecord = computed(
    () => this.workspace()?.canRecord() ?? (this.canMutate() && this.bill()?.status === 'UNPAID'),
  );

  readonly heading = computed(() => {
    const bill = this.bill();
    const verb = this.canRecord() ? 'Record payment' : 'Payments';
    if (!bill) return verb;
    return `${verb} · ${BILL_TYPE_LABELS[bill.type]}`;
  });
  readonly subheading = computed(() => {
    const bill = this.bill();
    if (!bill) return null;
    const source = billSourceOf(bill);
    const resident = source.resident;
    return `${resident.firstName} ${resident.lastName} · Unit ${source.unit.unitNo}`;
  });
  readonly target = computed<PaymentTarget | null>(() => {
    const bill = this.bill();
    return bill ? paymentTargetFromRow(bill) : null;
  });
}
