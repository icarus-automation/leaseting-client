import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { startWith, switchMap } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../../core/models/api.types';
import type { ChargeFrequency, ChargeItemResponse } from '../../../../../core/models/charge-item.types';
import { MANUAL_BILL_TYPE_OPTIONS, type BillType } from '../../../../../core/models/enums';
import { ChargeItemsService } from '../../../../settings/services/charge-items.service';
import {
  createChargeLineGroup,
  chargeOptions,
  type ChargeLineArray,
  type ChargeLineGroup,
  type ChargeOption,
} from './charge-line-form';
import { PesoInput } from '../../../../../shared/ui/peso-input/peso-input';
import { PESO_MAX_ERROR } from '../../../../../shared/ui/peso-input/peso-text.util';

@Component({
  selector: 'app-charge-lines',
  imports: [ProgressSpinner, ReactiveFormsModule, PIcon, Select, PesoInput],
  templateUrl: './charge-lines.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChargeLines {
  private readonly fb = inject(FormBuilder);
  private readonly chargeItems = inject(ChargeItemsService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** A new charge item joins the organization's catalog, which is settings:manage. */
  readonly canCreateItems = computed(() => this.auth.can('settings:manage'));

  readonly lines = input.required<ChargeLineArray>();
  readonly busy = input(false);
  readonly addLabel = input('Add another charge');
  readonly emptyMessage = input('No charges yet.');
  /** MONTHLY for lease terms (billed every month), ONE_TIME for charges billed once at move-in. */
  readonly frequency = input<ChargeFrequency>('MONTHLY');
  /** Keeps field ids unique when two lists share a page. */
  readonly idPrefix = input('charge');
  readonly descriptionPlaceholder = computed(() => (this.frequency() === 'MONTHLY' ? 'e.g. Includes parking' : 'e.g. 2 keys'));
  readonly newItemHint = computed(() =>
    this.frequency() === 'MONTHLY'
      ? 'Added as a monthly charge. Deposits and other one-time charges are set up in Settings › Charge items.'
      : 'Added as a one-time charge, billed once at move-in.',
  );

  readonly billTypeOptions = MANUAL_BILL_TYPE_OPTIONS;

  readonly catalog = signal<ChargeItemResponse[] | null>(null);
  readonly catalogError = signal<string | null>(null);

  readonly newItemMode = signal(false);
  readonly creatingItem = signal(false);
  readonly newItemError = signal<string | null>(null);

  readonly newItemForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],
    billType: ['OTHER' as BillType, [Validators.required]],
  });

  private readonly newItemInput = viewChild<ElementRef<HTMLInputElement>>('newItemInput');

  readonly options = computed<ChargeOption[]>(() => {
    const catalog = this.catalog();
    if (!catalog) return [];
    const chosen = new Set(
      this.lines()
        .controls.map((group) => group.controls.chargeItemId.value)
        .filter((id): id is string => id !== null),
    );
    return chargeOptions(catalog, chosen, this.frequency());
  });

  readonly loadingCatalog = computed(() => this.catalog() === null && this.catalogError() === null);

  /**
   * Ticks on every touch, value and status change in the lines, so the inline
   * errors show when the parent step marks the form touched on submit.
   */
  private readonly formTick = toSignal(
    toObservable(this.lines).pipe(switchMap((lines) => lines.events.pipe(startWith(null)))),
    { initialValue: null },
  );

  constructor() {
    this.loadCatalog();

    effect(() => {
      const options = this.options();
      if (options.length === 0) return;
      untracked(() => this.adoptOrphanLines(options));
    });
  }

  loadCatalog(): void {
    this.catalog.set(null);
    this.catalogError.set(null);
    this.chargeItems
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.catalog.set(items),
        error: (error: unknown) =>
          this.catalogError.set(apiErrorMessage(error, 'Could not load the charge items.')),
      });
  }

  /** The Charge field's error. The picked item sets `name`, so a line with no name has no charge. */
  chargeError(group: ChargeLineGroup): string | null {
    this.formTick();
    const { name, chargeItemId } = group.controls;
    if (name.valid || !(name.touched || chargeItemId.touched)) return null;
    return 'Pick a charge.';
  }

  /** Null over the cap too: the peso field says that itself. */
  amountError(group: ChargeLineGroup): string | null {
    this.formTick();
    const { amount } = group.controls;
    if (amount.valid || !amount.touched || amount.hasError(PESO_MAX_ERROR)) return null;
    return amount.hasError('min') ? 'Use 0 or more.' : 'Enter an amount.';
  }

  /** Moves focus to the first field with an error. False when every line is complete. */
  focusFirstInvalid(): boolean {
    const index = this.lines().controls.findIndex((group) => group.invalid);
    if (index < 0) return false;
    const group = this.lines().at(index);
    const field = group.controls.name.invalid ? 'item' : group.controls.amount.invalid ? 'amount' : 'note';
    this.host.nativeElement.querySelector<HTMLElement>(`#${this.idPrefix()}-${field}-${index}`)?.focus();
    return true;
  }

  addLine(): void {
    this.lines().push(createChargeLineGroup());
  }

  removeLine(index: number): void {
    this.lines().removeAt(index);
  }

  /**
   * Takes the item's name and type, and its default amount unless someone typed an amount
   * on this line, so picking another item updates a filled-in default. The amount stays
   * editable, and the line keeps its own copy: a later change to the default leaves it be.
   */
  onChargePicked(group: ChargeLineGroup, chargeItemId: string): void {
    const option = this.options().find((candidate) => candidate.value === chargeItemId);
    if (!option) return;
    group.controls.name.setValue(option.name);
    group.controls.billType.setValue(option.billType);
    const { amount } = group.controls;
    if (option.defaultAmount !== null && (amount.value === null || amount.pristine)) {
      amount.setValue(option.defaultAmount);
    }
  }

  openNewItem(): void {
    this.newItemForm.reset({ name: '', billType: 'OTHER' });
    this.newItemError.set(null);
    this.newItemMode.set(true);
    queueMicrotask(() => this.newItemInput()?.nativeElement.focus());
  }

  closeNewItem(): void {
    this.newItemMode.set(false);
    this.newItemError.set(null);
  }

  submitNewItem(): void {
    if (this.newItemForm.invalid) {
      this.newItemError.set('Use at least 2 characters.');
      return;
    }
    const { name, billType } = this.newItemForm.getRawValue();

    this.creatingItem.set(true);
    this.newItemError.set(null);
    this.chargeItems
      // Monthly is the API's default; leaving it out keeps an API from before frequencies working.
      .create({ name: name.trim(), billType, ...(this.frequency() === 'MONTHLY' ? {} : { frequency: this.frequency() }) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creatingItem.set(false);
          this.catalog.update((items) => [...(items ?? []), created]);
          this.closeNewItem();
          const group = createChargeLineGroup({ chargeItemId: created.id, name: created.name, billType: created.billType });
          this.lines().push(group);
        },
        error: (error: unknown) => {
          this.creatingItem.set(false);
          this.newItemError.set(apiErrorMessage(error, 'Could not add the charge item.'));
        },
      });
  }

  private adoptOrphanLines(options: ChargeOption[]): void {
    for (const group of this.lines().controls) {
      if (group.controls.chargeItemId.value) continue;
      const name = group.controls.name.value.trim().toLowerCase();
      if (!name) continue;
      const match = options.find((option) => option.name.toLowerCase() === name);
      if (match) group.controls.chargeItemId.setValue(match.value);
    }
  }
}
