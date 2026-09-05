import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { CalendarEntry, CalendarFeed } from '../../core/models/calendar.types';
import { OpsCalendar } from './calendar';
import { CalendarService } from './calendar.service';

describe('operations calendar interactions', () => {
  let fixture: ComponentFixture<OpsCalendar>;
  let component: OpsCalendar;
  let requests: Subject<CalendarFeed>[];
  const service = { properties: vi.fn(), events: vi.fn() };
  const entry: CalendarEntry = {
    id: 'bill-due:bill-1', sourceId: 'bill-1', type: 'BILL_DUE', title: 'Rent due', date: '2026-09-04',
    status: 'OVERDUE', statusLabel: 'Overdue', leaseId: 'lease-1', amount: '8000.00', balance: '6000.00',
    tenant: { id: 'tenant-1', name: 'Mina Santos' }, unit: { id: 'unit-1', unitNo: '4B' },
    property: { id: 'property-1', name: 'Mabini Residences' },
  };
  const feed = (events = [entry]): CalendarFeed => ({ events, today: '2026-09-05', timeZone: 'Asia/Manila' });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-09-04T16:30:00Z'));
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    requests = [];
    service.properties.mockReturnValue(of([]));
    service.events.mockImplementation(() => {
      const response = new Subject<CalendarFeed>();
      requests.push(response);
      return response.asObservable();
    });
    await TestBed.configureTestingModule({
      imports: [OpsCalendar],
      providers: [provideRouter([]), { provide: CalendarService, useValue: service }],
    }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(OpsCalendar);
    component = fixture.componentInstance;
    component.options.initialDate = '2026-09-05';
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('mounts the real Angular calendar and queries just the displayed month', () => {
    expect(fixture.nativeElement.querySelector('.fc-dayGridMonth-view')).toBeTruthy();
    const [start, end] = service.events.mock.calls[0];
    expect(start).toMatch(/^\d{4}-\d{2}-01$/);
    expect(end).toMatch(/^\d{4}-\d{2}-01$/);
    expect((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000).toBeGreaterThanOrEqual(28);
    expect(component.loading()).toBe(true);
    expect(component.options.editable).toBe(false);
    expect(component.options.selectable).toBe(false);
  });

  it('keeps the bill due date identical in the grid, preview and Manila today', async () => {
    const dueBill: CalendarEntry = { ...entry, date: '2026-09-05', status: 'TODAY', statusLabel: 'Due today' };
    requests[0].next(feed([dueBill]));
    component.selected.set(dueBill);
    await fixture.whenStable();

    const card: HTMLElement = fixture.nativeElement.querySelector('.fc-daygrid-event');
    expect(card.closest('[data-date]')?.getAttribute('data-date')).toBe('2026-09-05');
    expect(card.textContent).toContain('Due today');
    expect(fixture.nativeElement.querySelector('.fc-day-today')?.getAttribute('data-date')).toBe('2026-09-05');
    const preview: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Calendar entry details"]');
    expect(preview.textContent).toContain('Saturday, September 5, 2026');
    expect(preview.textContent).not.toContain('Friday, September 4, 2026');
    expect(preview.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-05');
  });

  it('has no Refresh control or general refresh action and removes the source-edit helper', async () => {
    requests[0].next(feed());
    component.selected.set(entry);
    await fixture.whenStable();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button'), (button) => (button as HTMLElement).textContent?.trim());
    expect(buttons).not.toContain('Refresh');
    expect('refresh' in component).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Update this entry by editing its source record.');
    const calls = service.events.mock.calls.length;
    component.retryEntries();
    await fixture.whenStable();
    expect(service.events.mock.calls.length).toBe(calls);
  });

  it('updates type filters and counts without re-fetching and retains an empty selection', async () => {
    requests[0].next(feed());
    await fixture.whenStable();
    const initialCalls = service.events.mock.calls.length;
    component.toggleType('BILL_DUE');
    await fixture.whenStable();
    expect(component.filtered()).toEqual([]);
    expect(component.typeCounts()['BILL_DUE']).toBe(1);
    expect(service.events.mock.calls.length).toBe(initialCalls);
    expect(fixture.nativeElement.textContent).toContain('No entries match these filters');
    for (const type of ['LEASE_START', 'LEASE_END', 'MOVE_IN'] as const) component.toggleType(type);
    expect(component.state().types).toEqual([]);
    expect(TestBed.inject(Router).navigate).toHaveBeenLastCalledWith([], expect.objectContaining({
      queryParams: expect.objectContaining({ types: 'none' }), replaceUrl: true,
    }));
    component.resetFilters();
    expect(component.filtered()).toHaveLength(1);
  });

  it('cancels stale requests when switching properties and clears stale entries during reload', async () => {
    requests[0].next(feed());
    await fixture.whenStable();
    component.setState({ propertyId: 'c8d12a5d-f07e-4b80-b1e6-d85e5b29cb94' });
    await fixture.whenStable();
    expect(component.loading()).toBe(true);
    expect(component.entries()).toEqual([]);
    requests[1].next(feed([{ ...entry, id: 'new-bill', title: 'Water due' }]));
    requests[0].next(feed());
    await fixture.whenStable();
    expect(component.entries().map((item) => item.id)).toEqual(['new-bill']);
    expect(component.loading()).toBe(false);
  });

  it('retries a failed feed request without exposing a general refresh action', async () => {
    requests[0].error(new Error('offline'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Could not load');
    expect(component.entries()).toEqual([]);
    const retry: HTMLButtonElement = fixture.nativeElement.querySelector('.ops-error button');
    retry.click();
    await fixture.whenStable();
    requests[1].next(feed([]));
    await fixture.whenStable();
    expect(component.error()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('No scheduled dates');
  });

  it('renders the agenda with status, amount and an exact bill source link', async () => {
    requests[0].next(feed());
    component.changeView('agenda');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.fc-listMonth-view')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.fc-list-event')?.textContent).toContain('Overdue');
    expect(fixture.nativeElement.querySelector('.fc-list-event')?.textContent).toContain('outstanding');
    // The source preview uses the same typed projection as calendar entries.
    component.selected.set(entry);
    await fixture.whenStable();
    const preview: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Calendar entry details"]');
    expect(preview.textContent).toContain('Mina Santos');
    expect(preview.textContent).toContain('Outstanding');
    expect(preview.querySelector('a')?.getAttribute('href')).toBe('/bills?billId=bill-1');
    component.closeEntry();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[aria-label="Calendar entry details"]')).toBeNull();
  });

  it('renders one bill status for paid and partly paid entries, matching the legend and preview', async () => {
    requests[0].next(feed([
      { ...entry, id: 'paid', status: 'PAID', statusLabel: 'Paid', balance: '0.00' },
      { ...entry, id: 'partial', date: '2026-09-06', status: 'DUE', statusLabel: 'Due' },
    ]));
    await fixture.whenStable();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.fc-daygrid-event .ops-event-status'),
      (node) => (node as HTMLElement).textContent);
    expect(labels).toContain('Paid');
    expect(labels).toContain('Due');
    expect(labels).not.toContain('Part paid');
    const legend: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Bill status legend"]');
    expect(legend.textContent).toContain('Due / Due today');
    expect(legend.textContent).toContain('Overdue');
    expect(legend.textContent).toContain('Paid');
    expect(legend.textContent).toContain('Lease and move-in dates stay neutral.');
    const partial = component.entries().find((item) => item.id === 'partial')!;
    component.selected.set(partial);
    await fixture.whenStable();
    const preview: HTMLElement = fixture.nativeElement.querySelector('[aria-label="Calendar entry details"]');
    expect(preview.querySelector('app-status-badge')?.textContent).toBe('Due');
    expect(preview.textContent).toContain('Payment status');
    expect(preview.textContent).toContain('₱6,000.00');
  });

  it('recomputes Today and refreshes an overnight calendar', async () => {
    requests[0].next(feed());
    await fixture.whenStable();
    component.today.set('2026-09-04');
    const calls = service.events.mock.calls.length;
    component.navigate('today');
    await fixture.whenStable();
    expect(component.today()).not.toBe('2026-09-04');
    expect(service.events.mock.calls.length).toBe(calls + 1);
  });

  it('rolls over at Manila midnight without moving the bill or needing a Refresh control', async () => {
    const dueBill: CalendarEntry = { ...entry, date: '2026-09-05', status: 'TODAY', statusLabel: 'Due today' };
    requests[0].next(feed([dueBill]));
    await fixture.whenStable();
    const calls = service.events.mock.calls.length;
    // 00:30 to the next midnight in Manila, independent of the machine timezone.
    vi.advanceTimersByTime(23.5 * 60 * 60 * 1000);
    await fixture.whenStable();
    expect(component.today()).toBe('2026-09-06');
    expect(service.events.mock.calls.length).toBe(calls + 1);
    expect(component.entries()).toEqual([]);
    requests.at(-1)!.next({ ...feed([{ ...dueBill, status: 'OVERDUE', statusLabel: 'Overdue' }]), today: '2026-09-06' });
    await fixture.whenStable();
    const card: HTMLElement = fixture.nativeElement.querySelector('.fc-daygrid-event');
    expect(card.closest('[data-date]')?.getAttribute('data-date')).toBe('2026-09-05');
    expect(card.textContent).toContain('Overdue');
    expect(card.textContent).not.toContain('Due today');
    expect(fixture.nativeElement.querySelector('.fc-day-today')?.getAttribute('data-date')).toBe('2026-09-06');
  });

  it('navigates to a week without inventing hour-based appointments', async () => {
    component.changeView('week');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.fc-dayGridWeek-view')).toBeTruthy();
    const [start, end] = service.events.mock.calls.at(-1)!;
    expect((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000).toBe(7);
    const previousStart = start;
    component.navigate('next');
    await fixture.whenStable();
    const [nextStart] = service.events.mock.calls.at(-1)!;
    expect((new Date(nextStart).getTime() - new Date(previousStart).getTime()) / 86_400_000).toBe(7);
  });
});
