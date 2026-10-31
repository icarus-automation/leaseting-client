import { googleSignInMessage, isGoogleSignInError } from './google-sign-in.util';

describe('googleSignInMessage', () => {
  it('reads the API reasons, which arrive with underscores for spaces', () => {
    expect(googleSignInMessage('invite_expired')).toBe(
      'This invitation has expired. Ask the person who invited you to send it again.',
    );
    expect(googleSignInMessage('no_access')).toContain('Ask your administrator for an invite');
  });

  it('falls back for a reason it does not know, such as a Better Auth one', () => {
    expect(googleSignInMessage('state_mismatch')).toBe("Google sign-in didn't finish. Try again.");
  });

  it('has nothing to say without an error', () => {
    expect(googleSignInMessage(null)).toBeNull();
    expect(googleSignInMessage('')).toBeNull();
  });

  it('recognises only the reasons it maps', () => {
    expect(isGoogleSignInError('invite_email_mismatch')).toBe(true);
    expect(isGoogleSignInError('toString')).toBe(false);
  });
});
