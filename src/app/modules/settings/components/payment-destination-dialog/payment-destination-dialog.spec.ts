import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { cryptoDestinationFixture, destinationFixture } from '../../../../shared/utils/payment-destination.fixture';
import { PaymentDestinationsService } from '../../services/payment-destinations.service';
import { PaymentDestinationDialog } from './payment-destination-dialog';

describe('PaymentDestinationDialog', () => {
  let fixture: ComponentFixture<PaymentDestinationDialog>;
  let dialog: PaymentDestinationDialog;
  const api = {
    create: vi.fn(),
    update: vi.fn(),
    qrUrl: (id: string) => `/payment-destinations/${id}/qr`,
  };
  const qr = new File(['qr'], 'qr.png', { type: 'image/png' });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentDestinationDialog],
      providers: [
        { provide: PaymentDestinationsService, useValue: api },
        { provide: ConfirmService, useValue: { danger: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentDestinationDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('properties', [{ id: 'prop-1', name: 'Brickstone Boarding House' }]);
    fixture.componentRef.setInput('destinations', [destinationFixture({ displayOrder: 4 })]);
    fixture.componentRef.setInput('canUseFallback', true);
    fixture.detectChanges();
    dialog = fixture.componentInstance;
  });

  afterEach(() => vi.clearAllMocks());

  function pickQr(): void {
    dialog.onQrPicked({ target: { files: [qr], value: '' } } as unknown as Event);
  }

  it('asks for the network and wallet address once the type is crypto', () => {
    dialog.pickType('CRYPTO');
    dialog.form.patchValue({ providerName: 'USDT', displayName: 'USDT (TRC20)' });

    expect(dialog.form.controls.accountName.valid).toBe(true);
    expect(dialog.form.controls.network.hasError('required')).toBe(true);
    expect(dialog.form.controls.walletAddress.hasError('required')).toBe(true);

    dialog.pickType('E_WALLET');
    expect(dialog.form.controls.network.valid).toBe(true);
    expect(dialog.form.controls.accountNumber.hasError('required')).toBe(true);
  });

  it('names a new destination after its provider until someone types a name', () => {
    dialog.form.controls.providerName.setValue('GCash');
    expect(dialog.form.controls.displayName.value).toBe('GCash');

    dialog.form.controls.displayName.setValue('Office GCash');
    dialog.form.controls.displayName.markAsDirty();
    dialog.form.controls.providerName.setValue('Maya');
    expect(dialog.form.controls.displayName.value).toBe('Office GCash');
  });

  it('adds a crypto destination with only the crypto fields, after the last in its group', () => {
    api.create.mockReturnValue(of(cryptoDestinationFixture()));
    const saved = vi.fn();
    dialog.saved.subscribe(saved);

    dialog.pickType('CRYPTO');
    dialog.form.patchValue({
      providerName: 'USDT',
      displayName: 'USDT (TRC20)',
      accountName: 'left over',
      network: 'TRC20',
      walletAddress: 'TQ5n8Lxk',
    });
    pickQr();
    dialog.submit();

    expect(api.create).toHaveBeenCalledWith(
      {
        type: 'CRYPTO',
        providerName: 'USDT',
        displayName: 'USDT (TRC20)',
        accountName: undefined,
        accountNumber: undefined,
        network: 'TRC20',
        walletAddress: 'TQ5n8Lxk',
        instructions: '',
        propertyId: undefined,
        displayOrder: 5,
      },
      qr,
    );
    expect(saved).toHaveBeenCalled();
    expect(dialog.visible()).toBe(false);
  });

  it('needs a QR to add a destination', () => {
    dialog.form.patchValue({ providerName: 'Maya', displayName: 'Maya', accountName: 'Ace', accountNumber: '0991' });
    dialog.submit();

    expect(api.create).not.toHaveBeenCalled();
    expect(dialog.qrError()).toContain('Upload the QR');
  });

  it('edits without a new QR and can move the destination to a property', () => {
    const maya = destinationFixture();
    api.update.mockReturnValue(of({ ...maya, propertyId: 'prop-1' }));
    fixture.componentRef.setInput('destination', maya);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    expect(dialog.heading()).toBe('Edit destination');
    expect(dialog.form.controls.accountNumber.value).toBe('09917897907');
    dialog.form.controls.propertyId.setValue('prop-1');
    dialog.submit();

    expect(api.update).toHaveBeenCalledWith(
      maya.id,
      expect.objectContaining({ type: 'E_WALLET', providerName: 'Maya', propertyId: 'prop-1' }),
      null,
    );
  });
});
