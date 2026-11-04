import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  ParkingPass,
  ParkingPassPrices,
  ParkingPassRefund,
  RenewParkingPassPayload,
  ReplaceParkingPassPrices,
  SellParkingPassPayload,
} from '../../../core/models/parking-pass.types';
import { toHttpParams } from '../../../shared/utils/http-params.util';

@Injectable({ providedIn: 'root' })
export class ParkingPassesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/parking-passes`;

  list(filters: { propertyId?: string; plate?: string } = {}): Observable<ParkingPass[]> {
    return this.http.get<ParkingPass[]>(this.base, { params: toHttpParams(filters) });
  }

  sell(payload: SellParkingPassPayload): Observable<ParkingPass> {
    return this.http.post<ParkingPass>(this.base, payload);
  }

  renew(id: string, payload: RenewParkingPassPayload): Observable<ParkingPass> {
    return this.http.post<ParkingPass>(`${this.base}/${id}/renewals`, payload);
  }

  changePlate(id: string, plate: string): Observable<ParkingPass> {
    return this.http.patch<ParkingPass>(`${this.base}/${id}/plate`, { plate });
  }

  end(id: string, reason: string): Observable<ParkingPass> {
    return this.http.post<ParkingPass>(`${this.base}/${id}/end`, { reason });
  }

  setAutoRenew(id: string, autoRenew: boolean): Observable<ParkingPass> {
    return this.http.patch<ParkingPass>(`${this.base}/${id}/auto-renew`, { autoRenew });
  }

  /** Raises the next month's bill by hand. Repeating it returns the same bill. */
  billNextMonth(id: string): Observable<ParkingPass> {
    return this.http.post<ParkingPass>(`${this.base}/${id}/bills`, {});
  }

  refund(paymentId: string, amount: number, reason: string): Observable<ParkingPassRefund> {
    return this.http.post<ParkingPassRefund>(`${API_BASE_URL}/parking-pass-payments/${paymentId}/refunds`, {
      amount,
      reason,
    });
  }

  prices(propertyId: string): Observable<ParkingPassPrices> {
    return this.http.get<ParkingPassPrices>(`${API_BASE_URL}/properties/${propertyId}/parking-pass-prices`);
  }

  replacePrices(propertyId: string, payload: ReplaceParkingPassPrices): Observable<ParkingPassPrices> {
    return this.http.put<ParkingPassPrices>(`${API_BASE_URL}/properties/${propertyId}/parking-pass-prices`, payload);
  }
}
