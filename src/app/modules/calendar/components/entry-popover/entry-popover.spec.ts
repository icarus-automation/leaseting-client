import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import type { CalendarEntry } from '../../../../core/models/calendar.types';
import { EntryPopover } from './entry-popover';

const BILL: CalendarEntry = {
  id: 'bill-due:bill-1', sourceId: 'bill-1', type: 'BILL_DUE', title: 'Rent due', date: '2026-11-11',
  status: 'OVERDUE', statusLabel: 'Overdue', leaseId: 'lease-1', ownershipId: null, amount: '4200.00', balance: '2200.00',
  resident: { id: 'resident-1', name: 'Mark Anthony Bello' }, unit: { id: 'unit-1', unitNo: '105' },
  property: { id: 'property-1', name: 'Brickstone Boarding House' },
};

describe('EntryPopover', () => {
  let fixture: ComponentFixture<EntryPopover>;
  let closed: boolean[];

  beforeEach(async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    await TestBed.configureTestingModule({ imports: [EntryPopover], providers: [provideRouter([])] }).compileComponents();
  });

  afterEach(() => {
    fixture.destroy();
    (fixture.nativeElement as HTMLElement).remove();
    vi.unstubAllGlobals();
  });

  async function open(entry: CalendarEntry, anchor: HTMLElement | null = null, instant = false): Promise<HTMLElement> {
    fixture = TestBed.createComponent(EntryPopover);
    fixture.componentRef.setInput('entry', entry);
    fixture.componentRef.setInput('anchor', anchor);
    fixture.componentRef.setInput('today', '2026-11-27');
    fixture.componentRef.setInput('instant', instant);
    closed = [];
    fixture.componentInstance.closed.subscribe((restore) => closed.push(restore));
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const text = (host: HTMLElement) => host.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  /** Each icon row's lines, in order. */
  const rows = (host: HTMLElement) =>
    [...host.querySelectorAll('li')].map((row) => [...row.querySelectorAll('p')].map((line) => text(line)));

  it('reads like an event card: title, date and how long ago, then tenant, unit and money', async () => {
    const host = await open(BILL);

    expect(host.getAttribute('role')).toBe('dialog');
    const title = host.querySelector('h2')!;
    expect(title.textContent?.trim()).toBe('Rent due');
    expect(host.getAttribute('aria-labelledby')).toBe(title.id);
    expect(text(host)).toContain('Wednesday, November 11 · 16 days ago');
    expect(text(host)).not.toContain('2026');
    expect(host.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-11');
    expect(rows(host)).toEqual([
      ['Mark Anthony Bello', 'Tenant'],
      ['Unit 105', 'Brickstone Boarding House'],
      ['₱2,200.00 outstanding', 'of ₱4,200.00 billed'],
    ]);
  });

  it('puts the status and the way to the bill along the bottom', async () => {
    const host = await open(BILL);
    const footer = host.querySelector('footer')!;

    expect(text(footer)).toContain('Payment status');
    expect(footer.querySelector('app-status-badge')?.textContent?.trim()).toBe('Overdue');
    const link = footer.querySelector('a')!;
    expect(link.textContent?.trim()).toBe('Open bill');
    expect(link.getAttribute('href')).toBe('/bills?billId=bill-1');
  });

  it('colors its square by status, like the month dots', async () => {
    const host = await open(BILL);
    expect(host.querySelector('span[aria-hidden="true"]')?.classList).toContain('bg-destructive');
  });

  it('says paid in full once nothing is owed', async () => {
    const host = await open({ ...BILL, status: 'PAID', statusLabel: 'Paid', balance: '0.00' });
    expect(rows(host)[2]).toEqual(['Paid in full', '₱4,200.00 billed']);
  });

  it('leaves money out of a lease entry and links to the lease', async () => {
    const host = await open({
      ...BILL, id: 'lease-end:lease-1', type: 'LEASE_END', title: 'Lease ends', sourceId: 'lease-1',
      status: 'UPCOMING', statusLabel: 'Upcoming', amount: null, balance: null, date: '2026-12-30',
    });

    expect(text(host)).not.toContain('billed');
    expect(text(host)).toContain('Wednesday, December 30 · In 33 days');
    expect(text(host)).toContain('In 33 days');
    expect(text(host.querySelector('footer')!)).toContain('Status');
    expect(host.querySelector('footer a')?.getAttribute('href')).toBe('/leases/lease-1');
  });

  it('notes how a planned move-in was dated', async () => {
    const host = await open({ ...BILL, type: 'MOVE_IN', title: 'Planned move-in', amount: null, balance: null, resident: null });
    expect(text(host)).toContain('No tenant selected yet');
    expect(text(host)).toContain('Planned from the onboarding start date.');
  });

  it('opens beside its entry, growing from that side, and takes focus', async () => {
    const anchor = document.createElement('a');
    anchor.getBoundingClientRect = () => ({ top: 400, left: 300, width: 200, height: 20, right: 500, bottom: 420, x: 300, y: 400, toJSON: () => ({}) });
    document.body.appendChild(anchor);

    const host = await open(BILL, anchor);

    expect(host.style.visibility).toBe('visible');
    expect(host.style.top).toBe('400px');
    expect(host.style.left).toBe('508px');
    // jsdom has no layout, so only the side is checked: the card grows from the edge facing the entry.
    expect(host.style.transformOrigin).toMatch(/^left /);
    expect(document.activeElement).toBe(host);
    anchor.remove();
  });

  it('shows the year only for an entry outside this year', async () => {
    const host = await open({ ...BILL, date: '2027-01-15' });
    expect(text(host)).toContain('Friday, January 15, 2027 · In 49 days');
  });

  it('appears at once when a key opened it', async () => {
    expect((await open(BILL, null, true)).hasAttribute('data-instant')).toBe(true);
  });

  it('closes and hands focus back on Escape and on its close button', async () => {
    const host = await open(BILL);
    host.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    (host.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click();

    expect(closed).toEqual([true, true]);
  });

  it('closes without taking focus back on a click elsewhere or a Tab out, but not on a click inside', async () => {
    const host = await open(BILL);
    const elsewhere = document.createElement('button');
    document.body.appendChild(elsewhere);

    host.querySelector('h2')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(closed).toEqual([]);

    elsewhere.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    host.dispatchEvent(new FocusEvent('focusout', { relatedTarget: elsewhere }));
    expect(closed).toEqual([false, false]);
    elsewhere.remove();
  });
});
