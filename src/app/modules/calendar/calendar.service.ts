import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_BASE_URL } from '../../core/config/api';
import { SKIP_CACHE_HEADER } from '../../core/http/cache.interceptor';
import { CalendarFeed, CalendarProperty } from '../../core/models/calendar.types';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly http = inject(HttpClient);

  events(start: string, end: string, propertyId: string) {
    let params = new HttpParams().set('start', start).set('end', end);
    if (propertyId) params = params.set('propertyId', propertyId);
    return this.http.get<CalendarFeed>(`${API_BASE_URL}/calendar/events`, {
      params, headers: { [SKIP_CACHE_HEADER]: 'true' },
    });
  }

  properties() {
    return this.http.get<CalendarProperty[]>(`${API_BASE_URL}/calendar/properties`, {
      headers: { [SKIP_CACHE_HEADER]: 'true' },
    });
  }
}
