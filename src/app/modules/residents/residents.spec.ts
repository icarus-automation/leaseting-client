import { Component, input, model, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { ResidentFormDialog } from './components/resident-form-dialog/resident-form-dialog';
import { Residents } from './residents';

@Component({ selector: 'app-resident-form-dialog', template: '' })
class ResidentFormDialogStub {
  readonly visible = model(false);
  readonly resident = input<unknown>(null);
  readonly saved = output<unknown>();
}

describe('Tenants', () => {
  let component: Residents;
  let fixture: ComponentFixture<Residents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Residents],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        ConfirmationService,
      ],
    })
      .overrideComponent(Residents, {
        remove: { imports: [ResidentFormDialog] },
        add: { imports: [ResidentFormDialogStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Residents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
