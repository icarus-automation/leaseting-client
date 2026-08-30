import { Component, input, model, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { TenantFormDialog } from './components/tenant-form-dialog/tenant-form-dialog';
import { Tenants } from './tenants';

@Component({ selector: 'app-tenant-form-dialog', template: '' })
class TenantFormDialogStub {
  readonly visible = model(false);
  readonly tenant = input<unknown>(null);
  readonly saved = output<unknown>();
}

describe('Tenants', () => {
  let component: Tenants;
  let fixture: ComponentFixture<Tenants>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tenants],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        MessageService,
        ConfirmationService,
      ],
    })
      .overrideComponent(Tenants, {
        remove: { imports: [TenantFormDialog] },
        add: { imports: [TenantFormDialogStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Tenants);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
