import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PendingPaymentSubmissionsService } from '../../core/payment-submissions/pending-payment-submissions.service';
import { OpenRequestsService } from '../../core/work-orders/open-requests.service';
import { BrandLogo } from '../../shared/ui/brand-logo/brand-logo';
import { Sidebar } from './sidebar';

@Component({ selector: 'app-brand-logo', template: '' })
class BrandLogoStub {
  readonly decorative = input(false);
}

@Component({ template: '' })
class BlankPage {}

describe('Sidebar', () => {
  const openCount = signal<number | null>(3);
  const paymentCount = signal<number | null>(2);
  const openRequests = { count: openCount, refresh: vi.fn() };
  const pendingPaymentSubmissions = { count: paymentCount, refresh: vi.fn() };
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    openCount.set(3);
    paymentCount.set(2);
    await TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [
        provideRouter([{ path: '**', component: BlankPage }]),
        { provide: OpenRequestsService, useValue: openRequests },
        {
          provide: PendingPaymentSubmissionsService,
          useValue: pendingPaymentSubmissions,
        },
      ],
    })
      .overrideComponent(Sidebar, {
        remove: { imports: [BrandLogo] },
        add: { imports: [BrandLogoStub] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Sidebar);
    await fixture.whenStable();
  });

  afterEach(() => {
    fixture.destroy();
    vi.clearAllMocks();
  });

  function navLink(label: string): HTMLAnchorElement {
    const links: HTMLAnchorElement[] = [...fixture.nativeElement.querySelectorAll('a.nav-item')];
    const link = links.find((element) => element.querySelector('.nav-label')?.textContent?.trim() === label);
    if (!link) throw new Error(`${label} link not rendered`);
    return link;
  }

  function countPill(link: HTMLElement): string | null {
    return link.querySelector('span.tabular-nums[aria-hidden="true"]')?.textContent?.trim() ?? null;
  }

  it('shows the Open count beside Work Orders and names the link with it', () => {
    const link = navLink('Work Orders');

    expect(countPill(link)).toBe('3');
    expect(link.getAttribute('aria-label')).toBe('Work Orders, 3 open');
  });

  it('shows the pending review count beside Payment submissions and names the link with it', () => {
    const link = navLink('Payment submissions');

    expect(countPill(link)).toBe('2');
    expect(link.getAttribute('aria-label')).toBe('Payment submissions, 2 pending review');
  });

  it('shows nothing at zero or while a count is unknown', async () => {
    openCount.set(0);
    paymentCount.set(0);
    await fixture.whenStable();
    expect(countPill(navLink('Work Orders'))).toBeNull();
    expect(navLink('Work Orders').hasAttribute('aria-label')).toBe(false);
    expect(countPill(navLink('Payment submissions'))).toBeNull();
    expect(navLink('Payment submissions').hasAttribute('aria-label')).toBe(false);

    openCount.set(null);
    paymentCount.set(null);
    await fixture.whenStable();
    expect(countPill(navLink('Work Orders'))).toBeNull();
    expect(countPill(navLink('Payment submissions'))).toBeNull();
  });

  it('puts counts on no other navigation items', () => {
    const counted: HTMLElement[] = [...fixture.nativeElement.querySelectorAll('a.nav-item:not(.nav-item--external)')];
    const labels = counted
      .filter((link) => countPill(link) !== null)
      .map((link) => link.querySelector('.nav-label')?.textContent?.trim());
    expect(labels).toEqual(['Payment submissions', 'Work Orders']);
  });

  it('re-reads both counts on load and after each navigation', async () => {
    expect(openRequests.refresh).toHaveBeenCalledTimes(1);
    expect(pendingPaymentSubmissions.refresh).toHaveBeenCalledTimes(1);

    await TestBed.inject(Router).navigateByUrl('/bills');
    await fixture.whenStable();

    expect(openRequests.refresh).toHaveBeenCalledTimes(2);
    expect(pendingPaymentSubmissions.refresh).toHaveBeenCalledTimes(2);
  });
});
