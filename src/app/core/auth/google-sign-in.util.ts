/**
 * A failed Google sign-in comes back to `errorCallbackURL` with `error` in the
 * query: the API's reason with spaces turned into underscores
 * (docs/fe-access-api.md, Google sign-in), or one of Better Auth's own.
 */
export type GoogleSignInError =
  | 'no_access'
  | 'deactivated'
  | 'not_a_staff_account'
  | 'unverified_google_email'
  | 'invite_email_mismatch'
  | 'invite_invalid'
  | 'invite_expired'
  | 'invite_revoked'
  | 'invite_declined'
  | 'invite_already_accepted'
  | 'invite_ambiguous'
  | 'access_denied';

const MESSAGES: Record<GoogleSignInError, string> = {
  no_access: "This Google account isn't on a Leaseting team yet. Ask your administrator for an invite.",
  deactivated:
    'Your access to this organization has been turned off. Ask its owner or an admin to turn it back on.',
  not_a_staff_account:
    "This email belongs to a Residence Care or parking terminal account, so it can't sign in to Leaseting.",
  unverified_google_email: "Google hasn't verified this email address. Verify it with Google, then try again.",
  invite_email_mismatch: "That Google account doesn't match the invited email.",
  invite_invalid: 'This invitation link is not valid. It may have been replaced by a newer invitation email.',
  invite_expired: 'This invitation has expired. Ask the person who invited you to send it again.',
  invite_revoked: 'This invitation was revoked. Ask the person who invited you for a new one.',
  invite_declined: 'This invitation was declined. Ask the person who invited you for a new one.',
  invite_already_accepted: 'This invitation was already accepted. Sign in instead.',
  invite_ambiguous:
    'This email has more than one invitation waiting. Open the link in the invitation email you want to accept.',
  access_denied: 'Google sign-in was canceled.',
};

const FALLBACK = "Google sign-in didn't finish. Try again.";

export function isGoogleSignInError(code: string): code is GoogleSignInError {
  return Object.hasOwn(MESSAGES, code);
}

/** The message for an `error` query value, or null when there is none. */
export function googleSignInMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return isGoogleSignInError(code) ? MESSAGES[code] : FALLBACK;
}
