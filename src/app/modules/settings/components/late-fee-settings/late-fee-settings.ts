import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { PIcon } from '@primeicons/angular/p-icon';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { forkJoin } from 'rxjs';

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
  imports: [ReactiveFormsModule, RouterLink, PIcon, InputNumber, Select, SegmentedControl, Skeleton],
  templateUrl: './late-fee-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateFeeSettings {
  private readonly fb = inject(FormBuilder);
  private readonly rulesApi = inject(LateFeeRuleService);
  private readonly chargeItemsApi = inject(ChargeItemsService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

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

  readonly livePostable = computed(() =>
    (this.chargeItems() ?? []).filter((item) => !item.isArchived && item.billType !== 'RENT'),
  );

  readonly chargeItemOptions = computed<{ value: string; label: string }[]>(() => {
    const currentId = this.formValue()?.chargeItemId ?? '';
    return (this.chargeItems() ?? [])
      .filter((item) => (!item.isArchived && item.billType !== 'RENT') || item.id === currentId)
      .map((item) => ({
        value: item.id,
        label: item.isArchived ? `${item.name} (archived)` : item.name,
      }));
  });

  readonly payload = computed<UpdateLateFeeRulePayload | null>(() => {
    const v = this.formValue();
    if (!v) return null;
    if (!v.enabled) return { mode: 'OFF' };
    if (!v.chargeItemId) return null;
    if (v.basis === 'FIXED') {
      if (!(v.amount != null && v.amount >= 0.01)) return null;
      return {
        mode: 'ON',
        graceDays: v.graceDays ?? 5,
        chargeItemId: v.chargeItemId,
        fee: { kind: 'FIXED', amount: v.amount },
      };
    }
    if (!(v.percent != null && v.percent >= 0.01)) return null;
    return {
      mode: 'ON',
      graceDays: v.graceDays ?? 5,
      chargeItemId: v.chargeItemId,
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
    this.form.controls.enabled.setValue(enabled);
    this.form.controls.enabled.markAsDirty();
  }

  setBasis(basis: LateFeeBasis): void {
    this.form.controls.basis.setValue(basis);
    this.form.controls.basis.markAsDirty();
  }

  onChargeItemChange(id: string): void {
    const item = (this.chargeItems() ?? []).find((candidate) => candidate.id === id);
    if (item?.defaultAmount && this.form.controls.basis.value === 'FIXED' && this.form.controls.amount.value === 0) {
      this.form.controls.amount.setValue(Number(item.defaultAmount));
    }
  }

  submit(): void {
    const payload = this.payload();
    if (!payload) {
      this.saveError.set('Pick the charge item late fees post as.');
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
