import type { BadgeTone } from '../../../shared/ui/status-badge/status-badge';
import type { PaymentSubmissionStatus } from '../../../core/models/payment-submission.types';

export function submissionStatusBadge(
  status: PaymentSubmissionStatus,
): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'PENDING_REVIEW':
      return { label: 'Pending review', tone: 'warning' };
    case 'APPROVED':
      return { label: 'Approved', tone: 'success' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'destructive' };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'neutral' };
  }
}
