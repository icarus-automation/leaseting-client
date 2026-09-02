import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type {
  AgingBucket,
  ArAgingDetail,
  ArAgingQuery,
  ArAgingSummary,
  CollectionsMonth,
  DelinquencyQuery,
  DelinquencyReport,
  PropertyOccupancy,
  RevenueByTenantQuery,
  RevenueByTenantReport,
} from '../../../core/models/report.types';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/reports`;

  collections(months = 12): Observable<CollectionsMonth[]> {
    const params = new HttpParams().set('months', months);
    return this.http.get<CollectionsMonth[]>(`${this.base}/collections`, { params });
  }

  aging(): Observable<AgingBucket[]> {
    return this.http.get<AgingBucket[]>(`${this.base}/aging`);
  }

  occupancy(): Observable<PropertyOccupancy[]> {
    return this.http.get<PropertyOccupancy[]>(`${this.base}/occupancy`);
  }

  revenueByTenant(query: RevenueByTenantQuery): Observable<RevenueByTenantReport> {
    let params = new HttpParams()
      .set('from', query.from)
      .set('to', query.to)
      .set('basis', query.basis);
    if (query.propertyId) params = params.set('propertyId', query.propertyId);
    return this.http.get<RevenueByTenantReport>(`${this.base}/revenue-by-tenant`, { params });
  }

  arAgingSummary(query: ArAgingQuery): Observable<ArAgingSummary> {
    return this.http.get<ArAgingSummary>(`${this.base}/ar-aging/summary`, {
      params: agingParams(query),
    });
  }

  arAgingDetail(query: ArAgingQuery): Observable<ArAgingDetail> {
    return this.http.get<ArAgingDetail>(`${this.base}/ar-aging/detail`, {
      params: agingParams(query),
    });
  }

  delinquency(query: DelinquencyQuery): Observable<DelinquencyReport> {
    let params = new HttpParams().set('months', query.months);
    if (query.asOf) params = params.set('asOf', query.asOf);
    if (query.propertyId) params = params.set('propertyId', query.propertyId);
    return this.http.get<DelinquencyReport>(`${this.base}/delinquency`, { params });
  }
}

/**
 * An absent `asOf` is sent as an absent parameter, never as an empty string:
 * the server reads "no date given" as "date it as of now", and an empty value
 * would fail its date validation instead.
 */
function agingParams(query: ArAgingQuery): HttpParams {
  let params = new HttpParams();
  if (query.asOf) params = params.set('asOf', query.asOf);
  if (query.propertyId) params = params.set('propertyId', query.propertyId);
  if (query.bucket) params = params.set('bucket', query.bucket);
  return params;
}
