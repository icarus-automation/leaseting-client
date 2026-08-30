import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  PaymentDestinationPayload,
  PaymentDestinationResponse,
} from '../../../core/models/payment-destination.types';

@Injectable({ providedIn: 'root' })
export class PaymentDestinationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/payment-destinations`;

  list(): Observable<PaymentDestinationResponse[]> {
    return this.http.get<PaymentDestinationResponse[]>(this.base);
  }

  create(payload: PaymentDestinationPayload, qrImage: File): Observable<PaymentDestinationResponse> {
    return this.http.post<PaymentDestinationResponse>(this.base, toFormData(payload, qrImage));
  }

  update(
    id: string,
    payload: PaymentDestinationPayload,
    qrImage: File | null = null,
  ): Observable<PaymentDestinationResponse> {
    return this.http.patch<PaymentDestinationResponse>(
      `${this.base}/${id}`,
      toFormData(payload, qrImage),
    );
  }

  reorder(items: { id: string; displayOrder: number }[]): Observable<PaymentDestinationResponse[]> {
    return this.http.post<PaymentDestinationResponse[]>(`${this.base}/reorder`, { items });
  }

  qrUrl(id: string): string {
    return `${this.base}/${id}/qr`;
  }
}

function toFormData(payload: PaymentDestinationPayload, qrImage: File | null): FormData {
  const form = new FormData();
  form.append('displayName', payload.displayName);
  form.append('method', payload.method);
  form.append('accountName', payload.accountName);
  form.append('accountNumber', payload.accountNumber);
  if (payload.instructions) form.append('instructions', payload.instructions);
  if (payload.propertyId) form.append('propertyId', payload.propertyId);
  if (payload.displayOrder !== undefined) form.append('displayOrder', String(payload.displayOrder));
  if (payload.isEnabled !== undefined) form.append('isEnabled', String(payload.isEnabled));
  if (qrImage) form.append('qrImage', qrImage, qrImage.name);
  return form;
}
