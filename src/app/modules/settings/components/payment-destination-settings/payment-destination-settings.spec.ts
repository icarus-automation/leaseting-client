import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { PaymentDestinationResponse } from '../../../../core/models/payment-destination.types';
import { PrivateImage } from '../../../../shared/ui/private-image/private-image';
import { PropertiesService } from '../../../properties/services/properties.service';
import { PaymentDestinationsService } from '../../services/payment-destinations.service';
import { PaymentDestinationSettings } from './payment-destination-settings';

@Component({ selector: 'app-private-image', template: '' })
class PrivateImageStub {
  readonly url = input.required<string>();
  readonly alt = input('');
  readonly fit = input<'contain' | 'width'>('contain');
}

const DESTINATION: PaymentDestinationResponse = {
  id: 'destination-1',
  displayName: 'Maya',
  method: 'OTHER',
  accountName: 'Leaseting',
  accountNumber: '09171234567',
  instructions: null,
  isEnabled: true,
  displayOrder: 0,
  propertyId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('PaymentDestinationSettings', () => {
  let fixture: ComponentFixture<PaymentDestinationSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentDestinationSettings],
      providers: [
        MessageService,
        {
          provide: PaymentDestinationsService,
          useValue: {
            list: () => of([DESTINATION]),
            qrUrl: (id: string) => `/payment-destinations/${id}/qr`,
          },
        },
        { provide: PropertiesService, useValue: { listAll: () => of([]) } },
        {
          provide: AuthService,
          useValue: { can: () => false, hasEveryProperty: () => false },
        },
      ],
    })
      .overrideComponent(PaymentDestinationSettings, {
        remove: { imports: [PrivateImage] },
        add: { imports: [PrivateImageStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PaymentDestinationSettings);
    fixture.detectChanges();
  });

  it('shows the whole QR in a centered 320px contain preview', () => {
    const viewButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.trim() === 'View QR');

    viewButton?.click();
    fixture.detectChanges();

    const image = fixture.debugElement.query(By.directive(PrivateImageStub));
    const imageElement = image.nativeElement as HTMLElement;
    const frame = imageElement.parentElement;

    expect(image.componentInstance.fit()).toBe('contain');
    expect(frame?.classList).toContain('h-80');
    expect(frame?.classList).toContain('items-center');
    expect(frame?.classList).toContain('justify-center');
    expect(frame?.classList).not.toContain('max-h-56');
    expect(frame?.classList).not.toContain('overflow-hidden');
    expect(imageElement.classList).toContain('h-full');
    expect(imageElement.classList).toContain('w-full');
  });
});
