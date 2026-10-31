import { HttpErrorResponse } from '@angular/common/http';

import { endsInvitation, inviteProblemOf, missingTokenProblem } from './invite-problem.util';

function apiError(status: number, message: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { statusCode: status, message } });
}

describe('inviteProblemOf', () => {
  it('turns the API sentence into a title and the advice under it, without repeating it', () => {
    expect(
      inviteProblemOf(apiError(410, 'This invitation has expired. Ask the person who invited you to send it again.')),
    ).toMatchObject({
      kind: 'expired',
      title: 'This invitation has expired',
      message: 'Ask the person who invited you to send it again.',
      retryable: false,
      offerSignIn: true,
    });
  });

  it('reads a 404 as a link that no longer works and points to sign-in', () => {
    expect(
      inviteProblemOf(
        apiError(404, 'This invitation link is not valid. It may have been replaced by a newer invitation email.'),
      ),
    ).toMatchObject({
      kind: 'invalid',
      title: 'This invitation link is not valid',
      message: 'It may have been replaced by a newer invitation email.',
      offerSignIn: true,
    });
  });

  it('tells revoked and declined apart on a 410', () => {
    expect(
      inviteProblemOf(apiError(410, 'This invitation was revoked. Ask the person who invited you for a new one.')),
    ).toMatchObject({ kind: 'revoked', offerSignIn: true });
    expect(inviteProblemOf(apiError(410, 'This invitation was declined.'))).toMatchObject({
      kind: 'declined',
      title: 'This invitation was declined',
      message: 'Ask the person who invited you for a new one.',
    });
  });

  it('points an accepted invitation at sign-in', () => {
    expect(inviteProblemOf(apiError(409, 'This invitation was already accepted. Sign in instead.'))).toMatchObject({
      kind: 'accepted',
      title: 'This invitation was already accepted',
      message: 'Sign in instead.',
      offerSignIn: true,
      retryable: false,
    });
  });

  it('offers a retry, not sign-in, when the server cannot be reached or fails', () => {
    expect(inviteProblemOf(new HttpErrorResponse({ status: 0 }))).toMatchObject({
      kind: 'offline',
      retryable: true,
      offerSignIn: false,
    });
    expect(inviteProblemOf(new HttpErrorResponse({ status: 500, error: null }))).toMatchObject({
      kind: 'unknown',
      title: 'Something went wrong',
      message: 'Try again in a moment.',
      retryable: true,
      offerSignIn: false,
    });
  });

  it('treats a missing token as its own state, with sign-in offered', () => {
    expect(missingTokenProblem()).toMatchObject({ kind: 'missing', retryable: false, offerSignIn: true });
  });
});

describe('endsInvitation', () => {
  it('ends the invitation on an unknown, used or lapsed link, not on a wrong password', () => {
    expect(endsInvitation(apiError(410, 'This invitation has expired.'))).toBe(true);
    expect(endsInvitation(apiError(409, 'This invitation was already accepted. Sign in instead.'))).toBe(true);
    expect(endsInvitation(apiError(401, 'That password does not match the Leaseting account for this email.'))).toBe(
      false,
    );
    expect(endsInvitation(apiError(400, 'Enter your name to create your account.'))).toBe(false);
  });
});
