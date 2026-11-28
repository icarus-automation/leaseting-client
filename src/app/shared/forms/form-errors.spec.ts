import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { PESO_MAX_ERROR } from '../ui/peso-input/peso-text.util';
import { createFormErrors } from './form-errors';

describe('createFormErrors', () => {
  const setup = () => {
    const form = new FormGroup({ amount: new FormControl<number | null>(null, [Validators.required]) });
    const errors = TestBed.runInInjectionContext(() => createFormErrors(form));
    form.controls.amount.markAsTouched();
    return { form, errors };
  };

  it('leaves an amount over the cap to the peso field, which says it itself', () => {
    const { form, errors } = setup();
    form.controls.amount.setErrors({ [PESO_MAX_ERROR]: { max: 99_999_999.99 } });

    expect(errors.fieldError('amount')).toBeNull();
  });

  it('still names any other problem with the field', () => {
    const { errors } = setup();

    expect(errors.fieldError('amount', { required: 'Enter an amount.' })).toBe('Enter an amount.');
  });
});
