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
import type { PropertyFloorItem } from '../../../../core/models/property.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ImageDropzone } from '../../../../shared/ui/image-dropzone/image-dropzone';
import { FloorsService } from '../../services/floors.service';

@Component({
  selector: 'app-floor-form-dialog',
  imports: [ReactiveFormsModule, ErrorBanner, FormDialog, ImageDropzone],
  templateUrl: './floor-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly floors = inject(FloorsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly propertyId = input.required<string>();
  /** Null → create mode; a floor → edit mode (level/name/plan image). */
  readonly floor = input<PropertyFloorItem | null>(null);
  readonly saved = output<string>();

  readonly form = this.fb.nonNullable.group({
    level: [1, [Validators.required, Validators.min(-5), Validators.max(200)]],
    name: [''],
  });
  readonly errors = createFormErrors(this.form);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  private readonly planFile = signal<File | null>(null);
  /** User interacted with the picker — distinguishes "removed plan" from "untouched". */
  readonly planTouched = signal(false);

  private readonly dropzone = viewChild(ImageDropzone);

  readonly isEdit = computed(() => this.floor() !== null);
  readonly heading = computed(() => (this.isEdit() ? 'Edit floor' : 'New floor'));

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const floor = this.floor();
      this.resetState();
      this.form.reset(
        floor ? { level: floor.level, name: floor.name ?? '' } : { level: 1, name: '' },
      );
    });
  }

  onPlanChange(file: File | null): void {
    this.planFile.set(file);
    this.planTouched.set(true);
  }

  onSubmit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { level, name } = this.form.getRawValue();
    const payload = { level, name: name.trim() || undefined };
    const planImage = this.planFile();
    const target = this.floor();
    const removePlanImage = !!target?.planImageUrl && this.planTouched() && !planImage;

    this.saving.set(true);
    const request$ = target
      ? this.floors.update(target.id, payload, planImage, removePlanImage)
      : this.floors.create(this.propertyId(), payload, planImage);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (floor) => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit(floor.id);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(
          apiErrorMessage(error, 'Could not save the floor. A floor with this level may already exist.'),
        );
      },
    });
  }

  private resetState(): void {
    this.errors.reset();
    this.errorMessage.set(null);
    this.planFile.set(null);
    this.planTouched.set(false);
    this.saving.set(false);
    this.dropzone()?.reset();
  }
}
