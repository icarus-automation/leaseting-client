import {
  appendPaymentMethod,
  createPaymentMethodGroup,
  paymentMethodPayload,
} from './payment-method-form';

describe('payment method form', () => {
  it('needs a destination only for an online payment', () => {
    const group = createPaymentMethodGroup();
    expect(group.valid).toBe(true);

    group.controls.method.setValue('ONLINE');
    expect(group.hasError('destinationRequired')).toBe(true);

    group.controls.destinationId.setValue('dest-1');
    expect(group.valid).toBe(true);

    group.controls.method.setValue('CHECK');
    group.controls.destinationId.setValue('');
    expect(group.valid).toBe(true);
  });

  it('sends only the destination for online', () => {
    expect(
      paymentMethodPayload({
        method: 'ONLINE',
        destinationId: 'dest-1',
        checkNumber: '0012',
        checkBank: 'BPI',
        checkDate: new Date(2026, 10, 20),
      }),
    ).toEqual({ method: 'ONLINE', destinationId: 'dest-1' });
  });

  it('sends the trimmed check details for a check, leaving out blanks', () => {
    expect(
      paymentMethodPayload({
        method: 'CHECK',
        destinationId: 'dest-1',
        checkNumber: ' 004512 ',
        checkBank: '',
        checkDate: new Date(2026, 10, 20),
      }),
    ).toEqual({ method: 'CHECK', checkNumber: '004512', checkBank: undefined, checkDate: '2026-11-20' });
  });

  it('sends nothing but the method for cash', () => {
    expect(
      paymentMethodPayload({ method: 'CASH', destinationId: 'dest-1', checkNumber: '1', checkBank: 'BPI', checkDate: null }),
    ).toEqual({ method: 'CASH' });
  });

  it('adds only the set method fields to a multipart body', () => {
    const form = new FormData();
    appendPaymentMethod(form, { method: 'CHECK', checkNumber: '0012', checkBank: undefined });

    expect([...form.keys()]).toEqual(['method', 'checkNumber']);
  });

  it("leaves the host's own fields to the host, so none is sent twice", () => {
    const form = new FormData();
    form.append('paidOn', '2026-11-20');
    const payload = { method: 'ONLINE' as const, destinationId: 'dest-1', paidOn: '2026-11-20', notes: 'Transfer' };

    appendPaymentMethod(form, payload);

    expect(form.getAll('paidOn')).toEqual(['2026-11-20']);
    expect(form.has('notes')).toBe(false);
    expect(form.get('destinationId')).toBe('dest-1');
  });
});
