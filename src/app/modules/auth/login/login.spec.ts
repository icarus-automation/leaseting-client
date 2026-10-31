import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { Login } from './login';

describe('Login', () => {
  const auth = { signIn: vi.fn(), startGoogleSignIn: vi.fn() };
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Login },
          { path: '**', children: [] },
        ]),
        { provide: AuthService, useValue: auth },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => vi.clearAllMocks());

  async function open(): Promise<Login> {
    const page = await harness.navigateByUrl('/login', Login);
    harness.detectChanges();
    return page;
  }

  function page(): HTMLElement {
    const root = harness.routeNativeElement;
    if (!root) throw new Error('Login not rendered');
    return root;
  }

  function text(): string {
    return (page().textContent ?? '').replace(/\s+/g, ' ');
  }

  function input(id: string): HTMLInputElement {
    const field = page().querySelector<HTMLInputElement>(`#${id}`);
    if (!field) throw new Error(`#${id} not rendered`);
    return field;
  }

  function type(id: string, value: string): void {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    page().querySelector('form')?.dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  it('names the product and shows only what signing in needs', async () => {
    await open();

    expect(page().querySelector('h1')?.textContent?.trim()).toBe('Leaseting');
    expect(text()).toContain('Property operations, from digital to intelligent systems.');
    expect(text()).toContain('Continue with Google');
    expect(page().querySelector('a[href="/login/forgot-password"]')?.textContent?.trim()).toBe('Forgot password?');
    expect(page().querySelector('input[type="checkbox"]')).toBeNull();
  });

  it('signs in with the email and password, then opens the dashboard', async () => {
    auth.signIn.mockReturnValue(of({}));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    await open();

    type('email', 'ops@example.com');
    type('password', 'a-password');
    submit();

    expect(auth.signIn).toHaveBeenCalledWith({ email: 'ops@example.com', password: 'a-password' });
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('flags empty fields without calling the API', async () => {
    await open();

    submit();

    expect(auth.signIn).not.toHaveBeenCalled();
    expect(text()).toContain('Email is required.');
    expect(text()).toContain('Password is required.');
    expect(input('email').getAttribute('aria-invalid')).toBe('true');
  });

  it('says so when the email or password is wrong', async () => {
    auth.signIn.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    await open();

    type('email', 'ops@example.com');
    type('password', 'wrong-password');
    submit();

    expect(page().querySelector('[role="alert"]')?.textContent?.trim()).toBe('Incorrect email or password.');
  });

  it('starts Google sign-in, coming back to the dashboard, or here on a refusal', async () => {
    auth.startGoogleSignIn.mockReturnValue(NEVER);
    await open();

    page().querySelector<HTMLButtonElement>('app-google-button button')?.click();

    const origin = document.location.origin;
    expect(auth.startGoogleSignIn).toHaveBeenCalledWith({
      callbackURL: `${origin}/dashboard`,
      errorCallbackURL: `${origin}/login`,
    });
  });

  it('shows and hides the password with one toggle', async () => {
    await open();
    const toggle = page().querySelector<HTMLButtonElement>('button[aria-controls="password"]');
    if (!toggle) throw new Error('password toggle not rendered');

    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(input('password').type).toBe('password');

    toggle.click();
    harness.detectChanges();

    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(input('password').type).toBe('text');
  });
});
