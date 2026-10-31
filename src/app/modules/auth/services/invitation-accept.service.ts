import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL, INVITATION_ENDPOINTS } from '../../../core/config/api';
import type {
  AcceptInvitationPayload,
  AcceptedInvitation,
  InvitationPreview,
} from '../../../core/models/invitation.types';

/**
 * The two public invitation routes. The token is the invitee's credential:
 * it goes to these routes (and Google sign-in) only, never to a log.
 */
@Injectable({ providedIn: 'root' })
export class InvitationAcceptService {
  private readonly http = inject(HttpClient);

  preview(token: string): Observable<InvitationPreview> {
    return this.http.post<InvitationPreview>(`${API_BASE_URL}${INVITATION_ENDPOINTS.preview}`, { token });
  }

  /** Joins the organization. It does not sign anyone in. */
  accept(payload: AcceptInvitationPayload): Observable<AcceptedInvitation> {
    return this.http.post<AcceptedInvitation>(`${API_BASE_URL}${INVITATION_ENDPOINTS.accept}`, payload);
  }
}
