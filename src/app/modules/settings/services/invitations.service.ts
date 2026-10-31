import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { CreateInvitationPayload, Invitation } from '../../../core/models/invitation.types';

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/invitations`;

  /** Open invitations, newest first, expired ones included so they can be resent. */
  list(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(this.base);
  }

  /** The email goes out before this returns; a send failure saves nothing. */
  create(payload: CreateInvitationPayload): Observable<Invitation> {
    return this.http.post<Invitation>(this.base, payload);
  }

  /** A fresh link with a new 7-day expiry; earlier links stop working. */
  resend(invitationId: string): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.base}/${invitationId}/resend`, {});
  }

  revoke(invitationId: string): Observable<Invitation> {
    return this.http.post<Invitation>(`${this.base}/${invitationId}/revoke`, {});
  }
}
