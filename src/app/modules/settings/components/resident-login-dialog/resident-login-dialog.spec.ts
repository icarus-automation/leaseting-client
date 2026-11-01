import { Component, input, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';

import type { Member } from '../../../../core/models/member.types';
import { EVERY_PROPERTY } from '../../../../core/models/property-access.types';
import type { PortalAccessResponse } from '../../../../core/models/portal-access.types';
import type { ResidentListItem } from '../../../../core/models/resident.types';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { ResidentLoginsService } from '../../services/resident-logins.service';
import { RESIDENT_LOGIN_HELPER_TEXT, ResidentLoginLookupError } from '../../utils/resident-login.util';
import { ResidentLoginDialog, type ResidentLoginOutcome } from './resident-login-dialog';

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

  focusFirstField(): void {}
}

const LOGIN: Member = {
  id: 'm-t1',
  userId: 'u-t1',
  name: 'Tess Tenant',
  email: 'tess@example.com',
  image: null,
  role: 'resident',
  roleName: 'Resident',
  audience: 'resident',
  status: 'ACTIVE',
  deactivatedAt: null,
  joinedAt: '2026-10-30T02:15:00.000Z',
  propertyAccess: EVERY_PROPERTY,
  lastActiveAt: null,
};

const RESIDENT: ResidentListItem = {
  id: 't-1',
  firstName: 'Tess',
  lastName: 'Tenant',
  email: 'tess@example.com',
  contactNo: '09171234567',
  photoUrl: null,
  notes: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  outstandingBalance: '0.00',
  unpaidBillCount: 0,
  maxDaysOverdue: 0,
};

const ISSUED: PortalAccessResponse = {
  residentId: 't-1',
  status: 'MUST_CHANGE_PASSWORD',
  email: 'tess@example.com',
  mustChangePassword: true,
  temporaryPassword: 'Temp-once-123',
};

const NO_LOGIN: PortalAccessResponse = { residentId: 't-1', status: 'INACTIVE', email: null, mustChangePassword: false };

describe('ResidentLoginDialog', () => {
  const logins = { searchActive: vi.fn(), access: vi.fn(), activate: vi.fn(), reset: vi.fn(), findResidentId: vi.fn() };
  let fixture: ComponentFixture<ResidentLoginDialog>;
  let component: ResidentLoginDialog;
  let outcomes: ResidentLoginOutcome[];

  async function open(member: Member | null): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [ResidentLoginDialog],
      providers: [MessageService, { provide: ResidentLoginsService, useValue: logins }],
    })
      .overrideComponent(ResidentLoginDialog, {
        remove: { imports: [FormDialog] },
        add: { imports: [FormDialogStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ResidentLoginDialog);
    component = fixture.componentInstance;
    outcomes = [];
    component.finished.subscribe((outcome) => outcomes.push(outcome));
    fixture.componentRef.setInput('member', member);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const text = (): string => fixture.nativeElement.textContent as string;
  const heading = (): string => fixture.debugElement.query(By.directive(FormDialogStub)).componentInstance.heading();

  beforeEach(() => {
    Object.values(logins).forEach((fn) => fn.mockReset());
    logins.searchActive.mockReturnValue(of([RESIDENT]));
    logins.access.mockReturnValue(of(NO_LOGIN));
  });

  describe('resetting a password', () => {
    beforeEach(async () => {
      logins.findResidentId.mockReturnValue(of('t-1'));
      logins.reset.mockReturnValue(of(ISSUED));
      await open(LOGIN);
    });

    it('names the login and says how to hand the password over', () => {
      expect(heading()).toBe('Reset password');
      expect(text()).toContain('Tess Tenant gets a new temporary password');
      expect(text()).toContain(RESIDENT_LOGIN_HELPER_TEXT);
    });

    it('resets the tenant behind the login, then shows the password once beside the helper text', () => {
      component.submit();
      fixture.detectChanges();

      expect(logins.findResidentId).toHaveBeenCalledWith(LOGIN);
      expect(logins.reset).toHaveBeenCalledWith('t-1');
      expect(heading()).toBe('Temporary password');
      expect(text()).toContain('Temp-once-123');
      expect(text()).toContain('tess@example.com');
      expect(text()).toContain('shown only once');
      expect(text()).toContain(RESIDENT_LOGIN_HELPER_TEXT);
      expect(outcomes).toEqual([{ kind: 'reset', email: 'tess@example.com' }]);
    });

    it('copies the password', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
      component.submit();
      fixture.detectChanges();

      await component.copyPassword();

      expect(writeText).toHaveBeenCalledWith('Temp-once-123');
    });

    it('stays on the question and says why when the login cannot be tied to one tenant', () => {
      logins.findResidentId.mockReturnValue(throwError(() => new ResidentLoginLookupError('No single match.')));

      component.submit();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('No single match.');
      expect(logins.reset).not.toHaveBeenCalled();
      expect(heading()).toBe('Reset password');
      expect(outcomes).toEqual([]);
    });
  });

  describe('setting a login up', () => {
    async function pickResident(): Promise<void> {
      await new Promise((resolve) => setTimeout(resolve, 300));
      component.form.controls.residentId.setValue('t-1');
      fixture.detectChanges();
    }

    beforeEach(async () => {
      logins.activate.mockReturnValue(of(ISSUED));
      await open(null);
    });

    it('offers active tenants and says how to hand the password over', async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(heading()).toBe('Add tenant login');
      expect(logins.searchActive).toHaveBeenCalledWith('');
      expect(text()).toContain(RESIDENT_LOGIN_HELPER_TEXT);
      expect(component.residentOptions().map((option) => option.id)).toEqual(['t-1']);
    });

    it('wants a tenant and an email before it calls the API', () => {
      component.submit();
      fixture.detectChanges();

      expect(text()).toContain('Pick the tenant this login is for.');
      expect(text()).toContain('Enter the email they will sign in with.');
      expect(logins.activate).not.toHaveBeenCalled();
    });

    it('fills the email from the tenant, sets the login up, and shows the password once', async () => {
      await pickResident();

      expect(component.form.controls.email.value).toBe('tess@example.com');
      component.submit();
      fixture.detectChanges();

      expect(logins.activate).toHaveBeenCalledWith('t-1', 'tess@example.com');
      expect(heading()).toBe('Temporary password');
      expect(text()).toContain('Temp-once-123');
      expect(text()).toContain(RESIDENT_LOGIN_HELPER_TEXT);
      expect(outcomes).toEqual([{ kind: 'setup', email: 'tess@example.com' }]);
    });

    it('will not set a second login up for a tenant that has one', async () => {
      logins.access.mockReturnValue(of({ ...ISSUED, status: 'ACTIVE', temporaryPassword: undefined }));
      await pickResident();

      component.submit();
      fixture.detectChanges();

      expect(text()).toContain('This tenant already has a login.');
      expect(logins.activate).not.toHaveBeenCalled();
      const primary = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
      expect(primary.disabled).toBe(true);
    });
  });
});
