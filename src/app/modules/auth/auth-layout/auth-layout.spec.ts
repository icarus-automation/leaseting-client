import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';

import { AuthLayout } from './auth-layout';

@Component({
  imports: [AuthLayout],
  template: `<app-auth-layout image="/assets/auth/login-panel.webp"><h1>Sign-in form</h1></app-auth-layout>`,
})
class Page {}

function render(wide: boolean): HTMLElement {
  TestBed.configureTestingModule({
    providers: [
      { provide: BreakpointObserver, useValue: { observe: () => of({ matches: wide, breakpoints: {} }) } },
    ],
  });
  const fixture = TestBed.createComponent(Page);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AuthLayout', () => {
  it('puts the page inside the main landmark', () => {
    expect(render(true).querySelector('main h1')?.textContent).toBe('Sign-in form');
  });

  it('shows the panel art beside the page on a wide screen, as decoration', () => {
    const image = render(true).querySelector('img');

    expect(image?.getAttribute('src')).toBe('/assets/auth/login-panel.webp');
    expect(image?.getAttribute('alt')).toBe('');
    expect(image?.closest('main')).toBeNull();
  });

  it('leaves the art out on a phone, so it is never downloaded', () => {
    const page = render(false);

    expect(page.querySelector('img')).toBeNull();
    expect(page.querySelector('main h1')?.textContent).toBe('Sign-in form');
  });
});
