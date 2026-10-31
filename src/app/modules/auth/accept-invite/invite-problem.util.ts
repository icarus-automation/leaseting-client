import { apiErrorMessage } from '../../../core/models/api.types';

export type InviteProblemKind =
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'declined'
  | 'accepted'
  | 'offline'
  | 'unknown';

export interface InviteProblem {
  kind: InviteProblemKind;
  title: string;
  message: string;
  /** Worth trying again: the link may still be fine. */
  retryable: boolean;
  /** Point to sign-in: the person may already be on the team. */
  offerSignIn: boolean;
}

/** Used when the API sends a single sentence, or none. */
const TITLES: Record<InviteProblemKind, string> = {
  missing: 'This link is missing its code',
  invalid: "This invitation link doesn't work",
  expired: 'This invitation has expired',
  revoked: 'This invitation was revoked',
  declined: 'This invitation was declined',
  accepted: 'This invitation was already accepted',
  offline: "Can't reach Leaseting",
  unknown: 'Something went wrong',
};

const BODIES: Record<InviteProblemKind, string> = {
  missing: 'Open the link in your invitation email again, or ask for a new invitation.',
  invalid: 'Open the newest invitation email, or ask for a new invitation.',
  expired: 'Ask the person who invited you to send it again.',
  revoked: 'Ask the person who invited you for a new one.',
  declined: 'Ask the person who invited you for a new one.',
  accepted: 'Sign in instead.',
  offline: 'Check your connection, then try again.',
  unknown: 'Try again in a moment.',
};

function problem(kind: InviteProblemKind, title: string, message: string): InviteProblem {
  return {
    kind,
    title,
    message,
    retryable: kind === 'offline' || kind === 'unknown',
    offerSignIn: kind === 'accepted' || kind === 'invalid',
  };
}

const normalized = (text: string) => text.toLowerCase().replace(/[.\s]+$/, '').trim();

/**
 * "This invitation has expired. Ask the person…" reads best as a title and
 * the advice under it, so the API's own words are kept without saying the
 * same sentence twice.
 */
function fromApiMessage(kind: InviteProblemKind, message: string): InviteProblem {
  const split = message.indexOf('. ');
  if (split > 0) return problem(kind, message.slice(0, split), message.slice(split + 2).trim());
  const body = message && normalized(message) !== normalized(TITLES[kind]) ? message : BODIES[kind];
  return problem(kind, TITLES[kind], body);
}

export function missingTokenProblem(): InviteProblem {
  return problem('missing', TITLES.missing, BODIES.missing);
}

/**
 * Names what the preview or accept call refused: 404 an unknown or replaced
 * link, 410 expired, revoked or declined, 409 already accepted.
 */
export function inviteProblemOf(error: unknown): InviteProblem {
  const status = (error as { status?: number } | null)?.status;
  if (status === 0) return problem('offline', TITLES.offline, BODIES.offline);

  const message = apiErrorMessage(error, '');
  const lower = message.toLowerCase();
  const kind: InviteProblemKind =
    status === 404 ? 'invalid'
    : status === 409 ? 'accepted'
    : status === 410 ? (lower.includes('revoked') ? 'revoked' : lower.includes('declined') ? 'declined' : 'expired')
    : 'unknown';
  return fromApiMessage(kind, message);
}

/** The refusals that end this invitation, as opposed to a wrong password or a missing name. */
export function endsInvitation(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return status === 404 || status === 409 || status === 410;
}
