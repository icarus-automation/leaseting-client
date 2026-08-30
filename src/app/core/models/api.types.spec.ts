import { apiErrorMessage } from './api.types';

describe('apiErrorMessage', () => {
  it('reads the backend exception-filter body', () => {
    expect(
      apiErrorMessage({ error: { message: 'Could not complete this request. Try again.' } }),
    ).toBe('Could not complete this request. Try again.');
  });

  it('uses the first class-validator message', () => {
    expect(apiErrorMessage({ error: { message: ['Amount is required', 'Too small'] } })).toBe(
      'Amount is required',
    );
  });

  it('explains a refused connection', () => {
    expect(apiErrorMessage({ status: 0, error: null }, 'Could not record the payment.')).toBe(
      "Can't reach the server. Check that the API is running.",
    );
  });

  it('falls back when the body has no message', () => {
    expect(apiErrorMessage({ status: 500, error: {} }, 'Could not record the payment.')).toBe(
      'Could not record the payment.',
    );
  });
});
