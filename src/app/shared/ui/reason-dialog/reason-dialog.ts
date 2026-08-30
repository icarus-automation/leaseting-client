import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { createFormErrors } from '../../forms/form-errors';
import { FormDialog } from '../form-dialog/form-dialog';

@Component({
  selector: 'app-reason-dialog',
  imports: [ReactiveFormsModule, FormDialog],
  template: `
    <app-form-dialog
      #dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [heading]="heading()"
      [subheading]="subheading()"
      [dirty]="errors.dirty()"
      width="28rem"
    >
      <form id="reason-form" class="flex flex-col gap-1.5" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <label class="text-[13px] font-medium text-heading" for="reason-text">{{ label() }}</label>
        <textarea
          id="reason-text"
          rows="3"
          class="rounded-base border border-border bg-background px-3 py-2 text-sm text-body outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-ring motion-reduce:transition-none"
          formControlName="reason"
        ></textarea>
        @if (errors.fieldError('reason'); as message) {
          <p class="text-[12.5px] text-destructive">{{ message }}</p>
        }
      </form>
      <ng-container dialog-footer>
        <button
          type="button"
          class="inline-flex h-9 items-center rounded-base border border-border bg-background px-3.5 text-[13px] font-medium text-body transition-colors duration-150 ease-out hover:bg-surface motion-reduce:transition-none"
          (click)="dialog.requestClose()"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="reason-form"
          class="inline-flex h-9 items-center rounded-base border-none bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-colors duration-150 ease-out hover:bg-primary-hover active:bg-primary-active motion-reduce:transition-none"
        >
          {{ confirmLabel() }}
        </button>
      </ng-container>
    </app-form-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReasonDialog {
  private readonly fb = inject(FormBuilder);

  readonly visible = model.required<boolean>();
  readonly heading = input.required<string>();
  readonly subheading = input<string | null>(null);
  readonly label = input('Reason');
  readonly confirmLabel = input('Confirm');
  readonly confirmed = output<string>();

  readonly form = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.minLength(1)]],
  });
  readonly errors = createFormErrors(this.form);

  onSubmit(): void {
    this.errors.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const reason = this.form.controls.reason.value.trim();
    if (!reason) return;
    this.confirmed.emit(reason);
    this.form.reset({ reason: '' });
    this.errors.reset();
    this.visible.set(false);
  }
}
