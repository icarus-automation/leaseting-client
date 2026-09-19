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
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PIcon } from '@primeicons/angular/p-icon';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PropertyFloorItem } from '../../../../core/models/property.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ImageCropper } from '../../../../shared/ui/image-cropper/image-cropper';
import { ImageDropzone } from '../../../../shared/ui/image-dropzone/image-dropzone';
import { FLOOR_PLAN_ASPECT } from '../../floor-plan.constants';
import { FloorsService } from '../../services/floors.service';

const MAX_PLAN_BYTES = 5 * 1024 * 1024;

@Component({
  selector: 'app-floor-form-dialog',
  imports: [ReactiveFormsModule, PIcon, ErrorBanner, FormDialog, ImageCropper, ImageDropzone],
  templateUrl: './floor-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly floors = inject(FloorsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly propertyId = input.required<string>();
  readonly floor = input<PropertyFloorItem | null>(null);
  readonly saved = output<string>();

  readonly planAspect = FLOOR_PLAN_ASPECT;

  readonly form = this.fb.nonNullable.group({
    level: [1, [Validators.required, Validators.min(-5), Validators.max(200)]],
    name: [''],
  });
  readonly errors = createFormErrors(this.form);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly cropSource = signal<File | null>(null);
  private readonly planFile = signal<File | null>(null);
  readonly croppedPreviewUrl = signal<string | null>(null);
  readonly planTouched = signal(false);
  readonly replacing = signal(false);

  private readonly dropzone = viewChild(ImageDropzone);
  private previewUrl: string | null = null;

  readonly isEdit = computed(() => this.floor() !== null);
  readonly heading = computed(() => (this.isEdit() ? 'Edit floor' : 'New floor'));

  readonly previewImage = computed(() => {
    const cropped = this.croppedPreviewUrl();
    if (cropped) return cropped;
    if (this.replacing() || this.planTouched()) return null;
    return this.floor()?.planImageUrl ?? null;
  });

  constructor() {
    /**
     * Reset when the dialog opens on a target — and only then. The body is
     * untracked deliberately: `resetState()` reads the `dropzone` view query,
     * and that query's result flips the instant a file is picked (the cropper
     * replaces the dropzone in the template). A tracked read makes this effect
     * re-fire on its own render, wiping `cropSource` before the cropper's
     * <img> has even loaded — which killed cropping outright and made
     * "Replace" look like it did nothing.
     */
    effect(() => {
      if (!this.visible()) return;
      const floor = this.floor();
      untracked(() => {
        this.resetState();
        this.form.reset(
          floor ? { level: floor.level, name: floor.name ?? '' } : { level: 1, name: '' },
        );
      });
    });

    this.destroyRef.onDestroy(() => this.revokePreview());
  }

  onPlanPicked(file: File | null): void {
    if (!file) {
      this.clearPlan();
      return;
    }
    this.errorMessage.set(null);
    this.cropSource.set(file);
  }

  onCropped(file: File): void {
    if (file.size > MAX_PLAN_BYTES) {
      this.errorMessage.set('The cropped plan is over 5 MB. Crop it tighter, or use a smaller image.');
      return;
    }
    this.revokePreview();
    this.previewUrl = URL.createObjectURL(file);
    this.planFile.set(file);
    this.croppedPreviewUrl.set(this.previewUrl);
    this.planTouched.set(true);
    this.replacing.set(false);
    this.cropSource.set(null);
    this.dropzone()?.reset();
  }

  onCropCancelled(): void {
    this.cropSource.set(null);
    this.replacing.set(false);
    this.dropzone()?.reset();
  }

  replacePlan(): void {
    this.errorMessage.set(null);
    this.replacing.set(true);
    this.cropSource.set(null);
  }

  cancelReplace(): void {
    this.replacing.set(false);
  }

  clearPlan(): void {
    this.revokePreview();
    this.planFile.set(null);
    this.croppedPreviewUrl.set(null);
    this.cropSource.set(null);
    this.replacing.set(false);
    this.planTouched.set(true);
    this.dropzone()?.reset();
  }

  onSubmit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.cropSource()) {
      this.errorMessage.set('Finish cropping the plan image first.');
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
    this.revokePreview();
    this.planFile.set(null);
    this.croppedPreviewUrl.set(null);
    this.cropSource.set(null);
    this.replacing.set(false);
    this.planTouched.set(false);
    this.saving.set(false);
    this.dropzone()?.reset();
  }

  private revokePreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }
}
