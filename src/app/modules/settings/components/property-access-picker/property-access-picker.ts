import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { PropertiesService } from '../../../properties/services/properties.service';
import { EVERY_PROPERTY_VALUE, type PropertyAccessValue } from '../../utils/property-access.util';

/** Past this many properties the list gets a search box. */
const SEARCH_THRESHOLD = 8;

/**
 * "All properties" or specific ones, as a form control holding a
 * {@link PropertyAccessValue}. It lists the properties the signed-in person
 * can see, which for someone limited is only their own; they can't give every
 * property, so that choice is off for them.
 */
@Component({
  selector: 'app-property-access-picker',
  imports: [ErrorBanner, Skeleton],
  templateUrl: './property-access-picker.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PropertyAccessPicker), multi: true }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertyAccessPicker implements ControlValueAccessor {
  private readonly propertiesApi = inject(PropertiesService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  /** Prefix for element ids, unique per form. */
  readonly idPrefix = input.required<string>();
  /** Shown under the choices, e.g. "Pick at least one property." */
  readonly error = input<string | null>(null);
  /** Who the choice is for, for the "All properties" hint: staff or an attendant. */
  readonly subject = input<'staff' | 'attendant'>('staff');

  readonly value = signal<PropertyAccessValue>(EVERY_PROPERTY_VALUE);
  readonly disabled = signal(false);
  readonly properties = signal<PropertyListItem[] | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly search = signal('');
  readonly skeletons = Array.from({ length: 3 });

  readonly canGiveEveryProperty = this.auth.hasEveryProperty;
  readonly showSearch = computed(() => (this.properties()?.length ?? 0) > SEARCH_THRESHOLD);
  readonly visibleProperties = computed(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.properties() ?? [];
    return term ? list.filter((property) => property.name.toLowerCase().includes(term)) : list;
  });
  readonly selectedCount = computed(() => this.value().propertyIds.length);
  readonly everyPropertyHint = computed(() =>
    this.subject() === 'attendant'
      ? 'Every terminal, at every property, including ones added later.'
      : 'Every property, including ones added later.',
  );
  readonly specificHint = computed(() =>
    this.subject() === 'attendant'
      ? 'Only the terminals at the properties you pick.'
      : 'They only see the properties you pick, and everything at them.',
  );

  private onChange: (value: PropertyAccessValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.load();
  }

  load(): void {
    this.properties.set(null);
    this.loadError.set(null);
    this.propertiesApi
      .listAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.properties.set([...list].sort((a, b) => a.name.localeCompare(b.name))),
        error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load the properties.')),
      });
  }

  writeValue(value: PropertyAccessValue | null): void {
    this.value.set(value ?? EVERY_PROPERTY_VALUE);
  }

  registerOnChange(fn: (value: PropertyAccessValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  chooseEveryProperty(everyProperty: boolean): void {
    if (everyProperty && !this.canGiveEveryProperty()) return;
    this.update({ ...this.value(), everyProperty });
  }

  isSelected(propertyId: string): boolean {
    return this.value().propertyIds.includes(propertyId);
  }

  toggle(propertyId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const ids = this.value().propertyIds.filter((id) => id !== propertyId);
    this.update({ everyProperty: false, propertyIds: checked ? [...ids, propertyId] : ids });
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  markTouched(): void {
    this.onTouched();
  }

  private update(value: PropertyAccessValue): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }
}
