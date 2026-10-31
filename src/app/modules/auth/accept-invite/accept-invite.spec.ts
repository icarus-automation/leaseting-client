import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import type { InvitationPreview } from '../../../core/models/invitation.types';
import { InvitationAcceptService } from '../services/invitation-accept.service';
import { AcceptInvite } from './accept-invite';

const TOKEN = '0b6a7f3e-1c2d.Q2xzig';

function preview(overrides: Partial<InvitationPreview> = {}): InvitationPreview {
  return {
    email: 'ben@example.com',
    role: 'member',
    organizationName: 'Brickstone Realty',
    expiresAt: '2026-11-06T09:00:00.000Z',
    hasAccount: false,
    ...overrides,
  };
}

function apiError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { statusCode: status, message } });
}

describe('AcceptInvite', () => {
  const invitations = { preview: vi.fn(), accept: vi.fn() };
  const auth = { signIn: vi.fn(), startGoogleSignIn: vi.fn() };
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'accept-invite', component: AcceptInvite },
          { path: '**', children: [] },
        ]),
        { provide: InvitationAcceptService, useValue: invitations },
        { provide: AuthService, useValue: auth },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => vi.clearAllMocks());

  async function open(url: string): Promise<AcceptInvite> {
    const page = await harness.navigateByUrl(url, AcceptInvite);
    harness.detectChanges();
    return page;
  }

  function text(): string {
    return (harness.routeNativeElement?.textContent ?? '').replace(/\s+/g, ' ');
  }

  function input(id: string): HTMLInputElement {
    const field = harness.routeNativeElement?.querySelector<HTMLInputElement>(`#${id}`);
    if (!field) throw new Error(`#${id} not rendered`);
    return field;
  }

  function type(id: string, value: string): void {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  function submit(): void {
    harness.routeNativeElement?.querySelector('form')?.dispatchEvent(new Event('submit'));
    harness.detectChanges();
  }

  it('says the link is incomplete when it has no token, without calling the API', async () => {
    await open('/accept-invite');

    expect(invitations.preview).not.toHaveBeenCalled();
    expect(text()).toContain('This link is missing its code');
  });

  it('shows the organization, the role and the invited email', async () => {
    invitations.preview.mockReturnValue(of(preview()));
    await open(`/accept-invite?token=${TOKEN}`);

    expect(invitations.preview).toHaveBeenCalledWith(TOKEN);
    expect(text()).toContain('Join Brickstone Realty');
    expect(text()).toContain('As Member');
    expect(input('invite-email').value).toBe('ben@example.com');
    expect(input('invite-name')).toBeTruthy();
  });

  it('creates the account, signs in to the organization it joined, and opens the dashboard', async () => {
    invitations.preview.mockReturnValue(of(preview()));
    invitations.accept.mockReturnValue(
      of({ organizationId: 'org-7', organizationName: 'Brickstone Realty', email: 'ben@example.com', role: 'member', isNewAccount: true }),
    );
    auth.signIn.mockReturnValue(of({}));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    await open(`/accept-invite?token=${TOKEN}`);

    type('invite-name', '  Ben Santos ');
    type('invite-password', 'a-long-password');
    submit();
    await harness.fixture.whenStable();

    expect(invitations.accept).toHaveBeenCalledWith({ token: TOKEN, name: 'Ben Santos', password: 'a-long-password' });
    expect(auth.signIn).toHaveBeenCalledWith({ email: 'ben@example.com', password: 'a-long-password' }, 'org-7');
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('asks an existing account for its password only', async () => {
    invitations.preview.mockReturnValue(of(preview({ hasAccount: true })));
    invitations.accept.mockReturnValue(throwError(() => apiError(401, 'That password does not match the Leaseting account for this email.')));
    await open(`/accept-invite?token=${TOKEN}`);

    expect(harness.routeNativeElement?.querySelector('#invite-name')).toBeNull();
    type('invite-password', 'wrong-password');
    submit();

    expect(invitations.accept).toHaveBeenCalledWith({ token: TOKEN, password: 'wrong-password' });
    expect(text()).toContain('That password does not match the Leaseting account for this email.');
    expect(text()).toContain('Join Brickstone Realty');
  });

  it.each([
    [410, 'This invitation has expired. Ask the person who invited you to send it again.', 'This invitation has expired', 'Ask the person who invited you to send it again.'],
    [410, 'This invitation was revoked. Ask the person who invited you for a new one.', 'This invitation was revoked', 'Ask the person who invited you for a new one.'],
    [409, 'This invitation was already accepted. Sign in instead.', 'This invitation was already accepted', 'Sign in instead.'],
    [404, 'This invitation link is not valid. It may have been replaced by a newer invitation email.', 'This invitation link is not valid', 'It may have been replaced by a newer invitation email.'],
  ])('explains a %s refusal: %s', async (status, message, title, advice) => {
    invitations.preview.mockReturnValue(throwError(() => apiError(status, message)));
    await open(`/accept-invite?token=${TOKEN}`);

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(title);
    expect(text()).toContain(advice);
    expect(text().split(title).length).toBe(2);
    expect(harness.routeNativeElement?.querySelector('form')).toBeNull();
  });

  it('says which Google account to use when Google signed in the wrong one', async () => {
    invitations.preview.mockReturnValue(of(preview()));
    await open(`/accept-invite?token=${TOKEN}&error=invite_email_mismatch&error_description=invite%20email%20mismatch`);

    expect(text()).toContain("That Google account isn't ben@example.com.");
    expect(text()).toContain('Join Brickstone Realty');
  });

  it('starts Google sign-in with the token, and comes back here on a refusal', async () => {
    invitations.preview.mockReturnValue(of(preview()));
    auth.startGoogleSignIn.mockReturnValue(NEVER);
    const page = await open(`/accept-invite?token=${TOKEN}`);

    page.continueWithGoogle();

    const origin = document.location.origin;
    expect(auth.startGoogleSignIn).toHaveBeenCalledWith({
      callbackURL: `${origin}/dashboard`,
      errorCallbackURL: `${origin}/accept-invite?token=${encodeURIComponent(TOKEN)}`,
      invitationToken: TOKEN,
    });
    expect(page.googleLoading()).toBe(true);
  });
});
