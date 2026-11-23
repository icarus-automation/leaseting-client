import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import type { PaymentDestinationResponse } from '../../../../core/models/payment-destination.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { cryptoDestinationFixture, destinationFixture } from '../../../../shared/utils/payment-destination.fixture';
import { PropertiesService } from '../../../properties/services/properties.service';
import { PaymentDestinationsService } from '../../services/payment-destinations.service';
import { PaymentDestinationSettings } from './payment-destination-settings';

@Component({ selector: 'app-private-image', template: '' })
class PrivateImageStub {
  readonly url = input.required<string>();
  readonly alt = input('');
  readonly fit = input<'contain' | 'width'>('contain');
  readonly compact = input(false);
}

const MAYA = destinationFixture();
const USDT = cryptoDestinationFixture({ displayOrder: 1 });
const BRICKSTONE_BANK = destinationFixture({
  id: 'dest-bdo',
  displayName: 'BDO Savings',
  type: 'BANK_TRANSFER',
  providerName: 'BDO',
  accountName: 'Brickstone Boarding House',
  accountNumber: '0034 5678 9012',
  propertyId: 'prop-1',
});

describe('PaymentDestinationSettings', () => {
  let fixture: ComponentFixture<PaymentDestinationSettings>;
  const api = {
    list: vi.fn(),
    update: vi.fn(),
    reorder: vi.fn(),
    qrUrl: (id: string) => `/payment-destinations/${id}/qr`,
  };

  async function render(destinations: PaymentDestinationResponse[], canManage = true): Promise<HTMLElement> {
    api.list.mockReturnValue(of(destinations));
    await TestBed.configureTestingModule({
      imports: [PaymentDestinationSettings],
      providers: [
        MessageService,
        { provide: ConfirmService, useValue: { danger: vi.fn() } },
        { provide: PaymentDestinationsService, useValue: api },
        {
          provide: PropertiesService,
          useValue: { listAll: () => of([{ id: 'prop-1', name: 'Brickstone Boarding House' }]) },
        },
        { provide: AuthService, useValue: { can: () => canManage, hasEveryProperty: () => true } },
      ],
    })
      .overrideComponent(PaymentDestinationSettings, {
        remove: { imports: [PrivateImage] },
        add: { imports: [PrivateImageStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PaymentDestinationSettings);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => vi.clearAllMocks());

  it('groups by property with the organization fallback last', async () => {
    const element = await render([MAYA, USDT, BRICKSTONE_BANK]);

    const headings = Array.from(element.querySelectorAll('h2')).map((heading) => heading.textContent?.replace(/\s+/g, ' ').trim());
    expect(headings).toEqual(['Brickstone Boarding House 1', 'Organization fallback 2']);
  });

  it('shows each row as name, type and provider, and the account name with a masked number', async () => {
    const element = await render([MAYA, USDT]);
    const rows = Array.from(element.querySelectorAll('li')).map((row) => row.textContent?.replace(/\s+/g, ' ').trim());

    expect(rows[0]).toContain('Brickstone Maya');
    expect(rows[0]).toContain('E-wallet · Maya');
    expect(rows[0]).toContain('Ace Gabriel Pasiliao · •••• 7907');
    expect(rows[0]).not.toContain('09917897907');
    expect(rows[1]).toContain('Crypto · USDT');
    expect(rows[1]).toContain('TRC20 · TQ5n8L…ZoKt');
  });

  it('shows the empty state with the Add button when there are no destinations', async () => {
    const element = await render([]);

    expect(element.textContent).toContain('No payment destinations yet');
    expect(element.textContent).toContain("Residents won't see a way to pay in the app.");
    const add = Array.from(element.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Add destination');
    expect(add).toBeDefined();
  });

  it('leaves the Add button out of the empty state for someone who cannot manage destinations', async () => {
    const element = await render([], false);

    expect(Array.from(element.querySelectorAll('button')).some((button) => button.textContent?.includes('Add destination'))).toBe(false);
  });

  it('disables a destination by sending only isEnabled', async () => {
    await render([MAYA]);
    api.update.mockReturnValue(of({ ...MAYA, isEnabled: false }));

    fixture.componentInstance.toggleEnabled(MAYA);
    fixture.detectChanges();

    expect(api.update).toHaveBeenCalledWith(MAYA.id, { isEnabled: false });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Disabled');
  });

  it('moves a destination down by renumbering its group', async () => {
    await render([MAYA, USDT]);
    api.reorder.mockReturnValue(of([USDT, MAYA]));

    fixture.componentInstance.move(MAYA, [MAYA, USDT], 1);

    expect(api.reorder).toHaveBeenCalledWith([
      { id: USDT.id, displayOrder: 0 },
      { id: MAYA.id, displayOrder: 1 },
    ]);
  });

  it('opens the QR viewer from the row thumbnail', async () => {
    const element = await render([MAYA]);

    (element.querySelector('button[aria-label="View QR for Brickstone Maya"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.qrVisible()).toBe(true);
    expect(fixture.componentInstance.qrDestination()?.id).toBe(MAYA.id);
  });
});
