import { HttpErrorResponse } from '@angular/common/http';
import { Component, input, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import type { Member } from '../../../../core/models/member.types';
import { EVERY_PROPERTY } from '../../../../core/models/property-access.types';
import type { ParkingAttendantResponse } from '../../../../core/models/parking-attendant.types';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import { AttendantPasswordDialog } from './attendant-password-dialog';

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

const ATTENDANT: Member = {
  id: 'm-a1',
  userId: 'u-a1',
  name: 'Basement attendant',
  email: 'basement@example.com',
  image: null,
  role: 'parking_attendant',
  roleName: 'Parking attendant',
  audience: 'parking',
  status: 'ACTIVE',
  deactivatedAt: null,
  joinedAt: '2026-10-30T02:15:00.000Z',
  propertyAccess: EVERY_PROPERTY,
  lastActiveAt: null,
};

describe('AttendantPasswordDialog', () => {
  const api = { setPassword: vi.fn() };
  let fixture: ComponentFixture<AttendantPasswordDialog>;
  let component: AttendantPasswordDialog;

  beforeEach(async () => {
    api.setPassword.mockReset();
    await TestBed.configureTestingModule({
      imports: [AttendantPasswordDialog],
      providers: [{ provide: ParkingAttendantsService, useValue: api }],
    })
      .overrideComponent(AttendantPasswordDialog, {
        remove: { imports: [FormDialog] },
        add: { imports: [FormDialogStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AttendantPasswordDialog);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('member', ATTENDANT);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('warns that every handheld signed in as them is signed out', () => {
    expect(fixture.nativeElement.textContent).toContain(
      'Every handheld signed in as Basement attendant is signed out and has to use the new password.',
    );
  });

  it('wants a password of at least 8 characters', () => {
    component.form.patchValue({ password: 'short' });

    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Use at least 8 characters.');
    expect(api.setPassword).not.toHaveBeenCalled();
  });

  it('sets the password by the attendant user id, then closes', () => {
    api.setPassword.mockReturnValue(of({ id: 'u-a1' } as ParkingAttendantResponse));
    const done: Member[] = [];
    component.passwordReset.subscribe((member) => done.push(member));
    component.form.patchValue({ password: 'a-new-password' });

    component.submit();

    expect(api.setPassword).toHaveBeenCalledWith('u-a1', 'a-new-password');
    expect(done).toEqual([ATTENDANT]);
    expect(component.visible()).toBe(false);
  });

  it('stays open and says why when the API refuses', () => {
    api.setPassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { statusCode: 404, message: 'Parking attendant not found' } })),
    );
    component.form.patchValue({ password: 'a-new-password' });

    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Parking attendant not found');
    expect(component.visible()).toBe(true);
  });
});
