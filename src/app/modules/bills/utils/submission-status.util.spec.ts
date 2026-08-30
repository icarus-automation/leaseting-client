import { submissionStatusBadge } from './submission-status.util';

describe('submissionStatusBadge', () => {
  it('labels pending review as a warning', () => {
    expect(submissionStatusBadge('PENDING_REVIEW')).toEqual({
      label: 'Pending review',
      tone: 'warning',
    });
  });

  it('labels rejected and cancelled history', () => {
    expect(submissionStatusBadge('REJECTED')).toEqual({ label: 'Rejected', tone: 'destructive' });
    expect(submissionStatusBadge('CANCELLED')).toEqual({ label: 'Cancelled', tone: 'neutral' });
  });
});
