import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';
import { forkJoin } from 'rxjs';
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { ChargeItemResponse } from '../../../../core/models/charge-item.types';
import {
  LATE_FEE_BASIS_OPTIONS,
  type LateFeeBasis,
  type LateFeeRuleResponse,
  type UpdateLateFeeRulePayload,
} from '../../../../core/models/late-fee-rule.types';
import { SegmentedControl } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { ChargeItemsService } from '../../services/charge-items.service';
import { LateFeeRuleService } from '../../services/late-fee-rule.service';

@Component({
  selector: 'app-late-fee-settings',
  imports: [ProgressSpinner, ReactiveFormsModule, PIcon, InputNumber, SegmentedControl, Skeleton],
  templateUrl: './late-fee-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateFeeSettings {
  private readonly fb = inject(FormBuilder);
  private readonly rulesApi = inject(LateFeeRuleService);
  private readonly chargeItemsApi = inject(ChargeItemsService);
  private readonly toast = inject(MessageService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly canManage = computed(() => this.auth.can('settings:manage'));

  readonly basisOptions = LATE_FEE_BASIS_OPTIONS;

  readonly rule = signal<LateFeeRuleResponse | null>(null);
  readonly chargeItems = signal<ChargeItemResponse[] | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = computed(() => this.rule() === null && this.error() === null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    enabled: [false],
    graceDays: [5, [Validators.required, Validators.min(0), Validators.max(60)]],
    basis: ['FIXED' as LateFeeBasis],
    amount: [0],
    percent: [0],
    chargeItemId: [''],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly enabled = computed(() => this.formValue()?.enabled === true);
  readonly basis = computed(() => this.formValue()?.basis ?? 'FIXED');

  /**
   * Late fees always post as the system Late fee item. An API that predates it still
   * requires the item's id, so the item named Late fee stands in until it is deployed.
   */
  readonly lateFeeItem = computed(() => {
    const items = this.chargeItems() ?? [];
    return (
      items.find((item) => item.systemKey === 'LATE_FEE') ??
      items.find((item) => item.name.trim().toLowerCase() === 'late fee') ??
      null
    );
  });
  readonly lateFeeItemName = computed(() => this.rule()?.chargeItem?.name ?? this.lateFeeItem()?.name ?? 'Late fee');

  readonly payload = computed<UpdateLateFeeRulePayload | null>(() => {
    const v = this.formValue();
    if (!v) return null;
    if (!v.enabled) return { mode: 'OFF' };
    const chargeItemId = v.chargeItemId || this.lateFeeItem()?.id;
    const postAs = chargeItemId ? { chargeItemId } : {};
    if (v.basis === 'FIXED') {
      if (!(v.amount != null && v.amount >= 0.01)) return null;
      return {
        mode: 'ON',
        graceDays: v.graceDays ?? 5,
        ...postAs,
        fee: { kind: 'FIXED', amount: v.amount },
      };
    }
    if (!(v.percent != null && v.percent >= 0.01)) return null;
    return {
      mode: 'ON',
      graceDays: v.graceDays ?? 5,
      ...postAs,
      fee: { kind: 'PERCENT', percent: v.percent },
    };
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.rule.set(null);
    this.chargeItems.set(null);
    this.error.set(null);
    forkJoin({
      rule: this.rulesApi.get(),
      chargeItems: this.chargeItemsApi.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ rule, chargeItems }) => {
          this.chargeItems.set(chargeItems);
          this.apply(rule);
        },
        error: (error: unknown) => this.error.set(apiErrorMessage(error, 'Could not load late fees.')),
      });
  }

  setEnabled(enabled: boolean): void {
    if (!this.canManage()) return;
    this.form.controls.enabled.setValue(enabled);
    this.form.controls.enabled.markAsDirty();
  }

  setBasis(basis: LateFeeBasis): void {
    if (!this.canManage()) return;
    this.form.controls.basis.setValue(basis);
    this.form.controls.basis.markAsDirty();
  }

  submit(): void {
    if (!this.canManage()) return;
    const payload = this.payload();
    if (!payload) {
      this.saveError.set('Enter a late fee above zero.');
      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.rulesApi
      .update(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rule) => {
          this.saving.set(false);
          this.apply(rule);
          this.form.markAsPristine();
          this.toast.add({ severity: 'success', summary: 'Late fees saved' });
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.saveError.set(apiErrorMessage(error, 'Could not save late fees.'));
        },
      });
  }

  private apply(rule: LateFeeRuleResponse): void {
    this.rule.set(rule);
    this.form.reset({
      enabled: rule.mode === 'ON',
      graceDays: rule.graceDays,
      basis: rule.fee?.kind ?? 'FIXED',
      amount: rule.fee?.kind === 'FIXED' ? Number(rule.fee.amount) : 0,
      percent: rule.fee?.kind === 'PERCENT' ? Number(rule.fee.percent) : 0,
      chargeItemId: rule.chargeItem?.id ?? '',
    });
  }
}
