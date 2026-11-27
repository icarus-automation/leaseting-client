import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';
import type { Permission } from '../../../../core/auth/permissions';
import { findNavPage } from '../../../../layout/sidebar/nav-sections';
import type { KitDocsSource, KitSource } from '../../kit-chat.types';
import { KitSourceChip } from './kit-source-chip';

const GUIDE = 'Bill utilities from meter readings';
const SOURCES: KitDocsSource[] = [
  { kind: 'docs', title: GUIDE, section: 'Bill a whole property this month', url: 'https://docs.leaseting.com/billing/utility-bills#monthly-run' },
  { kind: 'docs', title: GUIDE, section: 'How meter readings carry over', url: 'https://docs.leaseting.com/billing/utility-bills#readings' },
  { kind: 'docs', title: 'Icarus.Automation', section: null, url: 'https://icarusautomation.tech' },
];

describe('KitSourceChip', () => {
  let fixture: ComponentFixture<KitSourceChip>;

  async function render(sources: KitSource[], held: Permission[] = ['properties:view']): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [KitSourceChip],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { can: (code: Permission) => held.includes(code) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(KitSourceChip);
    fixture.componentRef.setInput('sources', sources);
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture.destroy();
    document.body.querySelectorAll('.p-popover').forEach((panel) => panel.remove());
  });

  const chip = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  const panel = () => document.body.querySelector('.p-popover') as HTMLElement | null;
  const link = () => panel()?.querySelector('a') as HTMLAnchorElement | null;
  const counter = () => panel()?.querySelector('[aria-live]')?.textContent?.trim();
  const arrow = (label: string) => panel()?.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement;

  async function open(): Promise<void> {
    chip().click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function press(label: string): void {
    arrow(label).click();
    fixture.detectChanges();
  }

  it('shows the first source’s title and how many more there are', async () => {
    await render(SOURCES);

    const labels = [...chip().querySelectorAll('span')].map((span) => span.textContent?.trim());
    expect(labels).toEqual([GUIDE, '+2']);
    expect(chip().querySelector('svg')).not.toBeNull();
    expect(chip().getAttribute('aria-label')).toBe(`Sources: ${GUIDE} and 2 more`);
  });

  it('shows no count and no pager for a single source', async () => {
    await render(SOURCES.slice(0, 1));

    expect(chip().textContent?.trim()).toBe(GUIDE);
    expect(chip().getAttribute('aria-label')).toBe(`Source: ${GUIDE}`);

    await open();
    expect(link()?.getAttribute('href')).toBe(SOURCES[0].url);
    expect(counter()).toBeUndefined();
    expect(arrow('Previous source')).toBeNull();
    expect(arrow('Next source')).toBeNull();
  });

  it('pages through every source in the popover, each opening in a new tab', async () => {
    await render(SOURCES);
    await open();

    expect(counter()).toBe('1/3');
    expect(link()?.textContent).toContain('Bill a whole property this month');
    expect(link()?.getAttribute('href')).toBe(SOURCES[0].url);
    expect(link()?.getAttribute('target')).toBe('_blank');
    expect(link()?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(arrow('Previous source').disabled).toBe(true);

    press('Next source');
    expect(counter()).toBe('2/3');
    expect(link()?.getAttribute('href')).toBe(SOURCES[1].url);
    expect(link()?.textContent).toContain('How meter readings carry over');

    press('Next source');
    expect(counter()).toBe('3/3');
    expect(link()?.textContent).toContain('Icarus.Automation');
    expect(arrow('Next source').disabled).toBe(true);

    press('Previous source');
    expect(counter()).toBe('2/3');
  });
});

describe('KitSourceChip for an app page', () => {
  const PROPERTIES: KitSource = { kind: 'app', title: 'Properties', section: null, route: '/properties' };
  let fixture: ComponentFixture<KitSourceChip>;

  async function render(source: KitSource, held: Permission[]): Promise<HTMLAnchorElement | null> {
    await TestBed.configureTestingModule({
      imports: [KitSourceChip],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AuthService, useValue: { can: (code: Permission) => held.includes(code) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(KitSourceChip);
    fixture.componentRef.setInput('sources', [source]);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('a');
  }

  afterEach(() => fixture.destroy());

  it('shows the page’s label and opens it in this tab with the router, no popover', async () => {
    const link = await render(PROPERTIES, ['properties:view']);

    expect(link?.textContent?.trim()).toBe('Properties');
    expect(link?.getAttribute('href')).toBe('/properties');
    expect(link?.getAttribute('target')).toBeNull();
    expect(link?.getAttribute('aria-label')).toBe('Open Properties');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();

    link?.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/properties');
  });

  it('draws the sidebar’s icon for the page', async () => {
    const link = await render(PROPERTIES, ['properties:view']);
    expect(link?.querySelector('svg')).not.toBeNull();
    expect(fixture.componentInstance.page()?.icon).toBe(findNavPage('/properties')?.icon);
    expect(fixture.componentInstance.page()?.icon).toBe('building');
  });

  it('draws nothing for a page this session may not open now', async () => {
    expect(await render(PROPERTIES, ['bills:view'])).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('draws nothing for a route the app does not have', async () => {
    expect(await render({ ...PROPERTIES, route: '/units' }, ['properties:view', 'units:view'])).toBeNull();
  });

  it('opens Settings with any one of the cards Settings shows', async () => {
    const settings: KitSource = { kind: 'app', title: 'Settings', section: null, route: '/settings' };
    expect(await render(settings, ['members:view'])).not.toBeNull();
    fixture.destroy();
    TestBed.resetTestingModule();
    expect(await render(settings, ['kit:use'])).toBeNull();
  });
});
