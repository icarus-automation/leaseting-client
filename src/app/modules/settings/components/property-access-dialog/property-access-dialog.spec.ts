import { HttpErrorResponse } from '@angular/common/http';
import { Component, input, model, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Member } from '../../../../core/models/member.types';
import { EVERY_PROPERTY, type PropertyAccess } from '../../../../core/models/property-access.types';
import type { PropertyListItem } from '../../../../core/models/property.types';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { PropertiesService } from '../../../properties/services/properties.service';
import { MembersService } from '../../services/members.service';
import { ParkingAttendantsService } from '../../services/parking-attendants.service';
import { PropertyAccessDialog } from './property-access-dialog';

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

const BRICKSTONE_ONLY: PropertyAccess = {
  isLimited: true,
  propertyIds: ['p-brickstone'],
  properties: [{ id: 'p-brickstone', name: 'Brickstone', isArchived: false }],
};

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm-ben',
    userId: 'u-ben',
    name: 'Ben Santos',
    email: 'ben@example.com',
    image: null,
    role: 'member',
    roleName: 'Member',
    audience: 'staff',
    status: 'ACTIVE',
    deactivatedAt: null,
    joinedAt: '2026-10-30T02:15:00.000Z',
    propertyAccess: EVERY_PROPERTY,
    lastActiveAt: null,
    ...overrides,
  };
}

const PROPERTIES = [
  { id: 'p-brickstone', name: 'Brickstone', city: 'Makati' },
  { id: 'p-harbor', name: 'Harbor View', city: 'Pasig' },
] as PropertyListItem[];

describe('PropertyAccessDialog', () => {
  const members = { setPropertyAccess: vi.fn() };
  const attendants = { setPropertyAccess: vi.fn() };
  let fixture: ComponentFixture<PropertyAccessDialog>;
  let component: PropertyAccessDialog;
  let changed: Member[];

  async function open(person: Member): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PropertyAccessDialog],
      providers: [
        { provide: MembersService, useValue: members },
        { provide: ParkingAttendantsService, useValue: attendants },
        { provide: PropertiesService, useValue: { listAll: () => of(PROPERTIES) } },
        { provide: AuthService, useValue: { hasEveryProperty: signal(true) } },
      ],
    })
      .overrideComponent(PropertyAccessDialog, {
        remove: { imports: [FormDialog] },
        add: { imports: [FormDialogStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PropertyAccessDialog);
    component = fixture.componentInstance;
    changed = [];
    component.changed.subscribe((updated) => changed.push(updated));
    fixture.componentRef.setInput('member', person);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    members.setPropertyAccess.mockReset();
    attendants.setPropertyAccess.mockReset();
  });

  it('starts from the person’s current limits', async () => {
    await open(member({ propertyAccess: BRICKSTONE_ONLY }));

    expect(component.heading()).toBe('Property access for Ben Santos');
    expect(component.form.controls.propertyAccess.value).toEqual({ everyProperty: false, propertyIds: ['p-brickstone'] });
  });

  it('limits a staff member through the members route, then hands back the row and closes', async () => {
    const updated = member({ propertyAccess: BRICKSTONE_ONLY });
    members.setPropertyAccess.mockReturnValue(of(updated));
    await open(member());
    component.form.controls.propertyAccess.setValue({ everyProperty: false, propertyIds: ['p-brickstone'] });

    component.submit();

    expect(members.setPropertyAccess).toHaveBeenCalledWith('m-ben', ['p-brickstone']);
    expect(attendants.setPropertyAccess).not.toHaveBeenCalled();
    expect(changed).toEqual([updated]);
    expect(component.visible()).toBe(false);
  });

  it('gives every property back with an empty list', async () => {
    members.setPropertyAccess.mockReturnValue(of(member()));
    await open(member({ propertyAccess: BRICKSTONE_ONLY }));
    component.form.controls.propertyAccess.setValue({ everyProperty: true, propertyIds: ['p-brickstone'] });

    component.submit();

    expect(members.setPropertyAccess).toHaveBeenCalledWith('m-ben', []);
  });

  it('limits an attendant through the attendants route by user id, keeping the rest of the row', async () => {
    const attendant = member({
      id: 'm-a1',
      userId: 'u-a1',
      name: 'Basement attendant',
      role: 'parking_attendant',
      roleName: 'Parking attendant',
      audience: 'parking',
    });
    attendants.setPropertyAccess.mockReturnValue(
      of({
        id: 'u-a1',
        name: 'Basement attendant',
        email: 'ben@example.com',
        status: 'ACTIVE',
        createdAt: '2026-10-01T00:00:00.000Z',
        propertyAccess: BRICKSTONE_ONLY,
      }),
    );
    await open(attendant);
    expect(component.subheading()).toContain('terminals');
    component.form.controls.propertyAccess.setValue({ everyProperty: false, propertyIds: ['p-brickstone'] });

    component.submit();

    expect(attendants.setPropertyAccess).toHaveBeenCalledWith('u-a1', ['p-brickstone']);
    expect(members.setPropertyAccess).not.toHaveBeenCalled();
    expect(changed).toEqual([{ ...attendant, propertyAccess: BRICKSTONE_ONLY }]);
  });

  it('wants a property picked before it calls the API', async () => {
    await open(member());
    component.form.controls.propertyAccess.setValue({ everyProperty: false, propertyIds: [] });

    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pick at least one property, or give every property.');
    expect(members.setPropertyAccess).not.toHaveBeenCalled();
  });

  it('stays open and says why when the API refuses', async () => {
    members.setPropertyAccess.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { statusCode: 403, message: 'You can only give properties you have access to.' },
          }),
      ),
    );
    await open(member());
    component.form.controls.propertyAccess.setValue({ everyProperty: false, propertyIds: ['p-harbor'] });

    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'You can only give properties you have access to.',
    );
    expect(component.visible()).toBe(true);
    expect(changed).toEqual([]);
  });

  it('names the archived properties a save drops', async () => {
    await open(
      member({
        propertyAccess: {
          isLimited: true,
          propertyIds: ['p-brickstone', 'p-old'],
          properties: [
            { id: 'p-brickstone', name: 'Brickstone', isArchived: false },
            { id: 'p-old', name: 'Old Mill', isArchived: true },
          ],
        },
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('Archived and dropped when you save: Old Mill.');
    expect(component.form.controls.propertyAccess.value.propertyIds).toEqual(['p-brickstone']);
  });
});
