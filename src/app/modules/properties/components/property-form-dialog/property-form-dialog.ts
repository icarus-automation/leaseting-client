import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
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
import { PIcon } from '@primeicons/angular/p-icon';
import { Select } from 'primeng/select';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PropertyResponse } from '../../../../core/models/property.types';
import type { PropertyTypeResponse } from '../../../../core/models/property-type.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ImageDropzone } from '../../../../shared/ui/image-dropzone/image-dropzone';
import { PropertyTypesService } from '../../../settings/services/property-types.service';
import { PropertiesService } from '../../services/properties.service';

/** Picker option; archived only appears for the property's current type. */
interface TypeOption {
  id: string;
  name: string;
  isArchived: boolean;
}

/** Above this the chip grid stops scanning well — switch to a filterable select. */
const MAX_CHIP_OPTIONS = 8;

@Component({
  selector: 'app-property-form-dialog',
  imports: [ReactiveFormsModule, PIcon, Select, ErrorBanner, FormDialog, ImageDropzone],
  templateUrl: './property-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyFormDialog {
  private readonly fb = inject(FormBuilder);
  private readonly properties = inject(PropertiesService);
  private readonly propertyTypes = inject(PropertyTypesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model.required<boolean>();
  readonly property = input<PropertyResponse | null>(null);
  readonly saved = output<PropertyResponse>();

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    // No default — picking a type is an explicit decision.
    propertyTypeId: ['', [Validators.required]],
    addressLine: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });
  readonly errors = createFormErrors(this.form);

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  private readonly imageFile = signal<File | null>(null);
  /** User interacted with the picker — distinguishes "removed photo" from "untouched". */
  readonly imageTouched = signal(false);

  /** null = loading. */
  readonly typeList = signal<PropertyTypeResponse[] | null>(null);
  readonly typesError = signal<string | null>(null);
  readonly newTypeMode = signal(false);
  readonly newTypeName = signal('');
  readonly creatingType = signal(false);
  readonly newTypeError = signal<string | null>(null);

  private readonly dropzone = viewChild(ImageDropzone);
  private readonly newTypeInput = viewChild<ElementRef<HTMLInputElement>>('newTypeInput');

  readonly isEdit = computed(() => this.property() !== null);
  readonly heading = computed(() => (this.isEdit() ? 'Edit property' : 'New property'));

  /**
   * Active types, plus the property's own type when archived (labelled so) —
   * editing another field must not silently reassign the type.
   */
  readonly pickerOptions = computed<TypeOption[]>(() => {
    const list = this.typeList();
    if (!list) return [];
    const options: TypeOption[] = list
      .filter((type) => !type.isArchived)
      .map((type) => ({ id: type.id, name: type.name, isArchived: false }));
    const current = this.property()?.type;
    if (current && !options.some((option) => option.id === current.id)) {
      options.push({ id: current.id, name: `${current.name} (archived)`, isArchived: true });
    }
    return options;
  });

  readonly useSelect = computed(() => this.pickerOptions().length > MAX_CHIP_OPTIONS);

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const property = this.property();
      this.resetState();
      this.loadTypes();
      if (property) {
        this.form.reset({
          name: property.name,
          propertyTypeId: property.type.id,
          addressLine: property.addressLine,
          city: property.city,
        });
      } else {
        this.form.reset();
      }
    });
  }

  loadTypes(): void {
    this.typeList.set(null);
    this.typesError.set(null);
    this.propertyTypes
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => this.typeList.set(types),
        error: (error: unknown) =>
          this.typesError.set(apiErrorMessage(error, 'Could not load property types.')),
      });
  }

  selectType(id: string): void {
    this.form.controls.propertyTypeId.setValue(id);
    this.form.controls.propertyTypeId.markAsTouched();
    this.form.controls.propertyTypeId.markAsDirty();
  }

  openNewType(): void {
    this.newTypeMode.set(true);
    this.newTypeName.set('');
    this.newTypeError.set(null);
    // Input mounts on the next change-detection pass.
    queueMicrotask(() => this.newTypeInput()?.nativeElement.focus());
  }

  closeNewType(): void {
    this.newTypeMode.set(false);
    this.newTypeError.set(null);
  }

  submitNewType(): void {
    const name = this.newTypeName().trim();
    if (name.length < 2) {
      this.newTypeError.set('Use at least 2 characters.');
      return;
    }

    this.creatingType.set(true);
    this.newTypeError.set(null);
    this.propertyTypes
      .create(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.creatingType.set(false);
          this.typeList.update((types) => [...(types ?? []), created]);
          this.selectType(created.id);
          this.closeNewType();
        },
        error: (error: unknown) => {
          this.creatingType.set(false);
          this.newTypeError.set(apiErrorMessage(error, 'Could not add the type.'));
        },
      });
  }

  onImageChange(file: File | null): void {
    this.imageFile.set(file);
    this.imageTouched.set(true);
  }

  onSubmit(): void {
    this.errors.submitted.set(true);
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    const image = this.imageFile();
    const target = this.property();
    const removeImage = !!target?.imageUrl && this.imageTouched() && !image;

    this.saving.set(true);
    const request$ = target
      ? this.properties.update(target.id, payload, image, removeImage)
      : this.properties.create(payload, image);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.visible.set(false);
        this.saved.emit(saved);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.errorMessage.set(apiErrorMessage(error, 'Could not save the property.'));
      },
    });
  }

  private resetState(): void {
    this.errors.reset();
    this.errorMessage.set(null);
    this.imageFile.set(null);
    this.imageTouched.set(false);
    this.saving.set(false);
    this.newTypeMode.set(false);
    this.newTypeError.set(null);
    this.dropzone()?.reset();
  }
}
