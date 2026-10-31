import { HttpErrorResponse } from '@angular/common/http';
import { Component, input, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { ParkingAttendantResponse } from '../../../../core/models/parking-attendant.types';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import { AttendantFormDialog } from './attendant-form-dialog';

@Component({
  selector: 'app-form-dialog',
  template: '<ng-content /><ng-content select="[dialog-footer]" />',
})
class FormDialogStub {
  readonly visible = model(false);
  readonly heading = input('');
  readonly subheading = input<string | null>(null);
  readonly width = input('');
  readonly dirty = input(false);

  requestClose(): void {
    this.visible.set(false);
  }
}

const CREATED: ParkingAttendantResponse = {
  id: 'u-a1',
  name: 'Basement attendant',
  email: 'basement@example.com',
  status: 'ACTIVE',
  createdAt: '2026-10-31T00:00:00.000Z',
};

describe('AttendantFormDialog', () => {
  const api = { create: vi.fn() };
  let fixture: ComponentFixture<AttendantFormDialog>;
  let component: AttendantFormDialog;

  beforeEach(async () => {
    api.create.mockReset();
    await TestBed.configureTestingModule({
      imports: [AttendantFormDialog],
      providers: [{ provide: ParkingAttendantsService, useValue: api }],
    })
      .overrideComponent(AttendantFormDialog, {
        remove: { imports: [FormDialog] },
        add: { imports: [FormDialogStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AttendantFormDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function fill(values: { name?: string; email?: string; password?: string }): void {
    component.form.patchValue(values);
    fixture.detectChanges();
  }

  it('says attendants sign in on the handheld app only', () => {
    expect(fixture.nativeElement.textContent).toContain('Attendants sign in on the handheld app only.');
  });

  it('asks for a name, an email and a password before it calls the API', () => {
    component.submit();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Enter a name for this login.');
    expect(text).toContain('Enter the login email.');
    expect(text).toContain('Enter a password.');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('wants a password of at least 8 characters', () => {
    fill({ name: 'Basement attendant', email: 'basement@example.com', password: 'short' });

    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Use at least 8 characters.');
    expect(api.create).not.toHaveBeenCalled();
  });

  it('adds the attendant with a trimmed name, then closes', () => {
    api.create.mockReturnValue(of(CREATED));
    const added: ParkingAttendantResponse[] = [];
    component.created.subscribe((attendant) => added.push(attendant));
    fill({ name: ' Basement attendant ', email: 'basement@example.com', password: 'a-long-password' });

    component.submit();

    expect(api.create).toHaveBeenCalledWith('Basement attendant', 'basement@example.com', 'a-long-password');
    expect(added).toEqual([CREATED]);
    expect(component.visible()).toBe(false);
  });

  it('stays open and says why when the API refuses', () => {
    api.create.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { statusCode: 409, message: 'That email is taken.' } })),
    );
    fill({ name: 'Basement attendant', email: 'basement@example.com', password: 'a-long-password' });

    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('That email is taken.');
    expect(component.visible()).toBe(true);
  });
});
