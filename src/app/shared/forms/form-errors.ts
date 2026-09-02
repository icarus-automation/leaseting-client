import { Signal, WritableSignal, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { FormGroup } from '@angular/forms';

export interface FormErrors {
  /** Flip to true on submit so untouched-but-invalid fields start reporting. */
  submitted: WritableSignal<boolean>;
  /** Signal view of form.dirty — e.g. for FormDialog's discard guard. */
  dirty: Signal<boolean>;
  /** Human message for a control, or null while the error should stay hidden. */
  fieldError(name: string, overrides?: Record<string, string>): string | null;
  /** Call when the form is (re)opened or reset. */
  reset(): void;
}

/**
 * Shared validation-display helper for reactive forms under OnPush: reading
 * fieldError() in a template subscribes it to form events (via toSignal), so
 * messages appear/disappear as the user types without manual change detection.
 *
 * Must be created in an injection context — use it as a class-field
 * initializer, declared after the `form` field it wraps.
 */
export function createFormErrors(form: FormGroup): FormErrors {
  const tick = toSignal(form.events, { initialValue: null });
  const submitted = signal(false);
  const dirty = computed(() => {
    tick();
    return form.dirty;
  });

  function fieldError(name: string, overrides?: Record<string, string>): string | null {
    tick();
    const control = form.get(name);
    if (!control) return null;
    const show = control.invalid && (control.touched || submitted());
    if (!show) return null;

    const errors = control.errors ?? {};
    for (const key of Object.keys(errors)) {
      const override = overrides?.[key];
      if (override) return override;
      switch (key) {
        case 'required':
          return 'This field is required.';
        case 'minlength':
          return `Too short. Use at least ${(errors[key] as { requiredLength: number }).requiredLength} characters.`;
        case 'maxlength':
          return 'Too long.';
        case 'email':
          return 'Enter a valid email address.';
        case 'min':
          return `Must be at least ${(errors[key] as { min: number }).min}.`;
        case 'max':
          return `Must be ${(errors[key] as { max: number }).max} or less.`;
        case 'pattern':
          return 'Check the format.';
      }
    }
    return overrides?.['default'] ?? 'Check this field.';
  }

  return {
    submitted,
    dirty,
    fieldError,
    reset: () => submitted.set(false),
  };
}
