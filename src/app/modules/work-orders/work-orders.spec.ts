import { Component, input, model, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import type { StaffMaintenanceRequest } from '../../core/models/maintenance-request.types';
import { OpenRequestsService } from '../../core/work-orders/open-requests.service';
import { PropertiesService } from '../properties/services/properties.service';
import { RequestDetailDialog } from './components/request-detail-dialog/request-detail-dialog';
import { MaintenanceRequestsService } from './services/maintenance-requests.service';
import { WorkOrders } from './work-orders';

@Component({ selector: 'app-request-detail-dialog', template: '' })
class RequestDetailDialogStub {
  readonly visible = model(false);
  readonly request = input<StaffMaintenanceRequest | null>(null);
  readonly changed = output<void>();
}

const OPEN_REQUEST: StaffMaintenanceRequest = {
  id: 'req-1',
  title: 'Kitchen sink clogged',
  notes: 'Water drains very slowly since this morning.',
  status: 'OPEN',
  photoUrls: [
    'http://localhost:8000/api/v1/maintenance-requests/req-1/photos/0',
    'http://localhost:8000/api/v1/maintenance-requests/req-1/photos/1',
  ],
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
};

describe('WorkOrders', () => {
  const api = { list: vi.fn() };
  const properties = { list: vi.fn() };
  const openRequests = { refresh: vi.fn() };
  let fixture: ComponentFixture<WorkOrders>;
  let component: WorkOrders;

  beforeEach(async () => {
    api.list.mockReturnValue(
      of({ data: [OPEN_REQUEST], meta: { total: 1, page: 1, limit: 20, lastPage: 1 } }),
    );
    properties.list.mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 50, lastPage: 1 } }));

    await TestBed.configureTestingModule({
      imports: [WorkOrders],
      providers: [
        provideRouter([]),
        { provide: MaintenanceRequestsService, useValue: api },
        { provide: PropertiesService, useValue: properties },
        { provide: OpenRequestsService, useValue: openRequests },
      ],
    })
      .overrideComponent(WorkOrders, {
        remove: { imports: [RequestDetailDialog] },
        add: { imports: [RequestDetailDialogStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(WorkOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  function button(label: string): HTMLButtonElement | undefined {
    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button')];
    return buttons.find((element) => element.textContent?.trim() === label);
  }

  it('opens on the Open queue without counts on the tabs', () => {
    expect(api.list).toHaveBeenCalledWith({ page: 1, limit: 20, status: 'OPEN' });
    expect(button('Open')).toBeTruthy();
    expect(button('In progress')).toBeTruthy();
    expect(button('Resolved')).toBeTruthy();
    expect(button('All')).toBeTruthy();
  });

  it('shows title, tenant, unit, property, submitted time, status, and photo count per row', () => {
    const row: HTMLElement = fixture.nativeElement.querySelector('tbody tr');
    const text = row.textContent ?? '';
    expect(text).toContain('Kitchen sink clogged');
    expect(text).toContain('Ace Gabriel Pasiliao');
    expect(text).toContain('106');
    expect(text).toContain('Brickstone Boarding House');
    expect(text).toContain('Sep 15, 2026');
    expect(text).toContain('Open');
    expect(text).toContain('2 photos');
  });

  it('asks the API for every status on All, and for one status on its tab', async () => {
    button('All')!.click();
    await fixture.whenStable();
    expect(api.list).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: undefined });

    button('In progress')!.click();
    await fixture.whenStable();
    expect(api.list).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: 'IN_PROGRESS' });
  });

  it('opens the detail from the request title', async () => {
    button('Kitchen sink clogged')!.click();
    await fixture.whenStable();

    expect(component.detailVisible()).toBe(true);
    expect(component.detailRequest()?.id).toBe('req-1');
  });

  it('scopes the list to one property', async () => {
    component.onPropertyChange('prop-1');
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      status: 'OPEN',
      propertyId: 'prop-1',
    });
  });

  it('reloads the list and sidebar badge in place after a request moves', async () => {
    api.list.mockReturnValue(of({ data: [], meta: { total: 0, page: 1, limit: 20, lastPage: 1 } }));
    openRequests.refresh.mockClear();

    component.onRequestChanged();
    await fixture.whenStable();

    expect(button('Open')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('No open requests');
    expect(openRequests.refresh).toHaveBeenCalledTimes(1);
  });

  it('steps back a page when the last row on a later page moved away', async () => {
    api.list
      .mockReturnValueOnce(of({ data: [], meta: { total: 20, page: 2, limit: 20, lastPage: 1 } }))
      .mockReturnValueOnce(of({ data: [OPEN_REQUEST], meta: { total: 20, page: 1, limit: 20, lastPage: 1 } }));

    component.load(2, { quiet: true });
    await fixture.whenStable();

    expect(api.list).toHaveBeenLastCalledWith({ page: 1, limit: 20, status: 'OPEN' });
    expect(component.meta()?.page).toBe(1);
  });
});
