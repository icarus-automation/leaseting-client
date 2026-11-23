import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  PaymentDestinationPayload,
  PaymentDestinationResponse,
} from '../../../core/models/payment-destination.types';
import { withDestinationDefaults } from '../../../shared/utils/payment-destination.util';

@Injectable({ providedIn: 'root' })
export class PaymentDestinationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/payment-destinations`;

  list(): Observable<PaymentDestinationResponse[]> {
    return this.http.get<PaymentDestinationResponse[]>(this.base).pipe(map((rows) => rows.map(withDestinationDefaults)));
  }

  create(payload: PaymentDestinationPayload, qrImage: File): Observable<PaymentDestinationResponse> {
    return this.http
      .post<PaymentDestinationResponse>(this.base, toFormData(payload, qrImage))
      .pipe(map(withDestinationDefaults));
  }

  update(
    id: string,
    payload: Partial<PaymentDestinationPayload>,
    qrImage: File | null = null,
  ): Observable<PaymentDestinationResponse> {
    return this.http
      .patch<PaymentDestinationResponse>(`${this.base}/${id}`, toFormData(payload, qrImage))
      .pipe(map(withDestinationDefaults));
  }

  reorder(items: { id: string; displayOrder: number }[]): Observable<PaymentDestinationResponse[]> {
    return this.http
      .post<PaymentDestinationResponse[]>(`${this.base}/reorder`, { items })
      .pipe(map((rows) => rows.map(withDestinationDefaults)));
  }

  qrUrl(id: string): string {
    return `${this.base}/${id}/qr`;
  }
}

/**
 * Multipart cannot send null, so only filled fields go, and the organization fallback
 * goes as an empty `propertyId`. The API clears the account pair that does not belong
 * to the destination's type.
 */
function toFormData(payload: Partial<PaymentDestinationPayload>, qrImage: File | null): FormData {
  const form = new FormData();
  const fields: (keyof PaymentDestinationPayload)[] = [
    'displayName',
    'type',
    'providerName',
    'accountName',
    'accountNumber',
    'network',
    'walletAddress',
  ];
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'string' && value) form.append(field, value);
  }
  if (payload.propertyId !== undefined) form.append('propertyId', payload.propertyId ?? '');
  if (payload.instructions !== undefined) form.append('instructions', payload.instructions);
  if (payload.displayOrder !== undefined) form.append('displayOrder', String(payload.displayOrder));
  if (payload.isEnabled !== undefined) form.append('isEnabled', String(payload.isEnabled));
  if (qrImage) form.append('qrImage', qrImage, qrImage.name);
  return form;
}
