import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ResidentAppAccountNotice } from './resident-app-account-notice';

describe('ResidentAppAccountNotice', () => {
  let fixture: ComponentFixture<ResidentAppAccountNotice>;

  async function render(canGiveLogin: boolean): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [ResidentAppAccountNotice],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ResidentAppAccountNotice);
    fixture.componentRef.setInput('deletedAt', '2026-11-17T05:00:00.000Z');
    fixture.componentRef.setInput('canGiveLogin', canGiveLogin);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('says the tenant deleted their app account, when, and that their records stayed', async () => {
    const element = await render(false);

    expect(element.textContent).toContain('App account deleted by tenant');
    expect(element.textContent).toContain('On Nov 17, 2026.');
    expect(element.textContent).toContain('Their lease, bills, and records stay here.');
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-17T05:00:00.000Z');
    expect(element.querySelector('a')).toBeNull();
  });

  it('points staff who can set logins up to the tenant logins', async () => {
    const element = await render(true);

    const link = element.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Users, Tenants');
    expect(link.getAttribute('href')).toBe('/settings/users?audience=residents');
  });
});
