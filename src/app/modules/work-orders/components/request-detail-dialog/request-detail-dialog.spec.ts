import { Component, input, model } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { Subject, of, throwError } from 'rxjs';

import type { StaffMaintenanceRequest } from '../../../../core/models/maintenance-request.types';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { MaintenanceRequestsService } from '../../services/maintenance-requests.service';
import { RequestPhotos } from '../request-photos/request-photos';
import { RequestDetailDialog } from './request-detail-dialog';

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

@Component({ selector: 'app-request-photos', template: '' })
class RequestPhotosStub {
  readonly urls = input<string[]>([]);
  readonly title = input('');
}


function maintenanceRequest(overrides: Partial<StaffMaintenanceRequest> = {}): StaffMaintenanceRequest {
  return {
    id: 'req-1',
    title: 'Kitchen sink clogged',
    notes: 'Water drains very slowly since this morning.',
    status: 'OPEN',
    photoUrls: [],
    resolveNote: null,
    startedAt: null,
    resolvedAt: null,
    createdAt: '2026-09-15T07:16:19.832Z',
    updatedAt: '2026-09-15T07:16:19.832Z',
    leaseId: 'lease-1',
    tenant: { id: 'tenant-1', firstName: 'Ace Gabriel', lastName: 'Pasiliao' },
    unit: { id: 'unit-1', unitNo: '106', property: { id: 'prop-1', name: 'Brickstone Boarding House' } },
    startedBy: null,
    resolvedBy: null,
    ...overrides,
  };
}

function conflict(message: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 409,
    error: { statusCode: 409, message, error: 'Conflict', path: '/api/v1/maintenance-requests', timestamp: '' },
  });
}

describe('RequestDetailDialog', () => {
  const api = { get: vi.fn(), start: vi.fn(), resolve: vi.fn() };
  let fixture: ComponentFixture<RequestDetailDialog>;
  let component: RequestDetailDialog;
  let toast: MessageService;
  let changed: number;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestDetailDialog],
      providers: [MessageService, { provide: MaintenanceRequestsService, useValue: api }],
    })
      .overrideComponent(RequestDetailDialog, {
        remove: { imports: [FormDialog, RequestPhotos] },
        add: { imports: [FormDialogStub, RequestPhotosStub] },
      })
      .compileComponents();

    toast = TestBed.inject(MessageService);
    vi.spyOn(toast, 'add');
    fixture = TestBed.createComponent(RequestDetailDialog);
    component = fixture.componentInstance;
    changed = 0;
    component.changed.subscribe(() => changed++);
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  async function open(row: StaffMaintenanceRequest, fresh: StaffMaintenanceRequest = row): Promise<void> {
    api.get.mockReturnValue(of(fresh));
    fixture.componentRef.setInput('request', row);
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  }

  function button(label: string): HTMLButtonElement | undefined {
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button')];
    return buttons.find((element) => element.textContent?.trim() === label);
  }

  function noteField(): HTMLTextAreaElement | null {
    return fixture.nativeElement.querySelector('#resolve-note') as HTMLTextAreaElement | null;
  }

  it('shows the request and offers Start while it is Open', async () => {
    await open(maintenanceRequest());

    const text: string = fixture.nativeElement.textContent;
    expect(api.get).toHaveBeenCalledWith('req-1');
    expect(text).toContain('Water drains very slowly since this morning.');
    expect(text).toContain('Ace Gabriel Pasiliao');
    expect(text).toContain('106');
    expect(text).toContain('Brickstone Boarding House');
    expect(button('Start')).toBeTruthy();
    expect(button('Resolve')).toBeUndefined();
  });

  it('starts an Open request, tells the queue, and closes', async () => {
    await open(maintenanceRequest());
    api.start.mockReturnValue(
      of(maintenanceRequest({ status: 'IN_PROGRESS', startedAt: '2026-09-15T07:16:20.850Z' })),
    );

    button('Start')!.click();
    await fixture.whenStable();

    expect(api.start).toHaveBeenCalledWith('req-1');
    expect(changed).toBe(1);
    expect(component.visible()).toBe(false);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Request started' }));
  });

  it('on a 409 shows the API message and the request as it stands now', async () => {
    await open(maintenanceRequest());
    api.start.mockReturnValue(throwError(() => conflict('This request is already in progress.')));
    api.get.mockReturnValue(of(maintenanceRequest({ status: 'IN_PROGRESS' })));

    button('Start')!.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('This request is already in progress.');
    expect(component.current()?.status).toBe('IN_PROGRESS');
    expect(button('Start')).toBeUndefined();
    expect(button('Resolve')).toBeTruthy();
    expect(changed).toBe(1);
    expect(component.visible()).toBe(true);
  });

  it('shows the optional tenant note inline on an In progress request', async () => {
    await open(maintenanceRequest({ status: 'IN_PROGRESS' }));

    expect(noteField()).toBeTruthy();
    expect(noteField()!.maxLength).toBe(500);
    expect(fixture.nativeElement.textContent).toContain('Note for the tenant (optional)');
    expect(fixture.nativeElement.textContent).toContain(
      'The tenant sees this in Residence Care. 500 characters left.',
    );
    expect(fixture.nativeElement.querySelector('app-resolve-request-dialog')).toBeNull();
  });

  it('resolves an In progress request with the inline note and closes', async () => {
    await open(maintenanceRequest({ status: 'IN_PROGRESS' }));
    api.resolve.mockReturnValue(
      of(maintenanceRequest({ status: 'RESOLVED', resolveNote: 'Cleared the trap under the sink.' })),
    );
    noteField()!.value = '  Cleared the trap under the sink.  ';
    noteField()!.dispatchEvent(new Event('input'));

    button('Resolve')!.click();
    await fixture.whenStable();

    expect(api.resolve).toHaveBeenCalledWith('req-1', 'Cleared the trap under the sink.');
    expect(component.visible()).toBe(false);
    expect(changed).toBe(1);
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ summary: 'Request resolved' }));
  });

  it('keeps the inline note and shows the reason when Resolve fails without a conflict', async () => {
    await open(maintenanceRequest({ status: 'IN_PROGRESS' }));
    component.resolveForm.controls.resolveNote.setValue('Cleared the trap under the sink.');
    api.resolve.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    component.resolve();
    await fixture.whenStable();

    expect(component.error()).toContain("Can't reach the server");
    expect(component.resolveForm.controls.resolveNote.value).toBe('Cleared the trap under the sink.');
    expect(component.visible()).toBe(true);
    expect(changed).toBe(0);
  });

  it('shows the current request after a 409 from Resolve', async () => {
    await open(maintenanceRequest({ status: 'IN_PROGRESS' }));
    api.resolve.mockReturnValue(throwError(() => conflict('This request is already resolved.')));
    api.get.mockReturnValue(of(maintenanceRequest({ status: 'RESOLVED' })));

    component.resolve();
    await fixture.whenStable();

    expect(component.error()).toBe('This request is already resolved.');
    expect(component.current()?.status).toBe('RESOLVED');
    expect(button('Resolve')).toBeUndefined();
  });

  it('offers no step once resolved and shows who did what', async () => {
    await open(
      maintenanceRequest({
        status: 'RESOLVED',
        startedAt: '2026-09-15T07:16:20.850Z',
        resolvedAt: '2026-09-15T07:16:20.932Z',
        resolveNote: 'Cleared the trap under the sink.',
        startedBy: { id: 'user-1', name: 'Leaseting Admin' },
        resolvedBy: { id: 'user-1', name: 'Leaseting Admin' },
      }),
    );

    const text: string = fixture.nativeElement.textContent;
    expect(button('Start')).toBeUndefined();
    expect(button('Resolve')).toBeUndefined();
    expect(text).toContain('Started by Leaseting Admin');
    expect(text).toContain('Resolved by Leaseting Admin');
    expect(text).toContain('Cleared the trap under the sink.');
  });

  it('drops a background read still in flight when Start goes out', async () => {
    const slowRead = new Subject<StaffMaintenanceRequest>();
    api.get.mockReturnValue(slowRead.asObservable());
    fixture.componentRef.setInput('request', maintenanceRequest());
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    api.start.mockReturnValue(of(maintenanceRequest({ status: 'IN_PROGRESS' })));

    button('Start')!.click();
    slowRead.next(maintenanceRequest({ status: 'OPEN' }));
    await fixture.whenStable();

    expect(slowRead.observed).toBe(false);
    expect(component.current()?.status).toBe('IN_PROGRESS');
    expect(changed).toBe(1);
  });

  it('tells the queue when the fresh read shows someone else already moved it', async () => {
    await open(maintenanceRequest(), maintenanceRequest({ status: 'IN_PROGRESS' }));

    expect(changed).toBe(1);
    expect(button('Resolve')).toBeTruthy();
  });
});
