import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { TenantResponse } from '../../../../core/models/tenant.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ImageDropzone } from '../../../../shared/ui/image-dropzone/image-dropzone';
import { TenantsService } from '../../services/tenants.service';

@Component({
  selector: 'app-tenant-form-dialog',
  imports: [ReactiveFormsModule, ErrorBanner, FormDialog, ImageDropzone],
  templateUrl: './tenant-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TenantFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly tenants = inject(TenantsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  /** Null → create mode; a tenant → edit mode. */
  readonly tenant = input<TenantResponse | null>(null);
  /** Emits the saved tenant so lists can highlight the row it landed on. */
  readonly saved = output<TenantResponse>();

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    contactNo: ['', [Validators.required, Validators.pattern(/^\+?[0-9][0-9 -]{6,19}$/)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    notes: ['', [Validators.maxLength(2000)]],
  });
  readonly errors = createFormErrors(this.form);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  private readonly photoFile = signal<File | null>(null);
  /** User interacted with the picker — distinguishes "removed photo" from "untouched". */
  readonly photoTouched = signal(false);

  private readonly dropzone = viewChild(ImageDropzone);

  readonly isEdit = computed(() => this.tenant() !== null);
  readonly heading = computed(() => (this.isEdit() ? 'Edit tenant' : 'New tenant'));

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const tenant = this.tenant();
      this.errors.reset();
      this.errorMessage.set(null);
      this.saving.set(false);
      this.photoFile.set(null);
      this.photoTouched.set(false);
      this.dropzone()?.reset();
      this.form.reset(
        tenant
          ? {
              firstName: tenant.firstName,
              lastName: tenant.lastName,
              contactNo: tenant.contactNo,
              email: tenant.email ?? '',
              notes: tenant.notes ?? '',
            }
          : { firstName: '', lastName: '', contactNo: '', email: '', notes: '' },
      );
    });
  }

  onPhotoChange(file: File | null): void {
    this.photoFile.set(file);
    this.photoTouched.set(true);
  }

  onSubmit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName, contactNo, email, notes } = this.form.getRawValue();
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      contactNo: contactNo.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    const target = this.tenant();
    const photo = this.photoFile();
    const removePhoto = !!target?.photoUrl && this.photoTouched() && !photo;

    this.saving.set(true);
    const request$ = target
      ? this.tenants.update(target.id, payload, photo, removePhoto)
      : this.tenants.create(payload, photo);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit(saved);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(apiErrorMessage(error, 'Could not save the tenant.'));
      },
    });
  }
}
