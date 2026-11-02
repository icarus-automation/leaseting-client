import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { Paginated } from '../../../core/models/api.types';
import type {
  CreatePropertyPayload,
  PropertyDetail,
  PropertyListItem,
  PropertyResponse,
} from '../../../core/models/property.types';

/** The API's largest page for `GET /properties`. */
const MAX_PAGE_SIZE = 50;

@Injectable({ providedIn: 'root' })
export class PropertiesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/properties`;

  list(page = 1, limit = 12): Observable<Paginated<PropertyListItem>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<Paginated<PropertyListItem>>(this.base, { params });
  }

  /** Every unarchived property the session can see, by name: page one, then the rest together. */
  listAll(): Observable<PropertyListItem[]> {
    return this.list(1, MAX_PAGE_SIZE).pipe(
      switchMap((first) => {
        const rest = Array.from({ length: Math.max(first.meta.lastPage - 1, 0) }, (_, index) =>
          this.list(index + 2, MAX_PAGE_SIZE),
        );
        return rest.length === 0
          ? of(first.data)
          : forkJoin(rest).pipe(map((pages) => [first, ...pages].flatMap((result) => result.data)));
      }),
    );
  }

  get(id: string): Observable<PropertyDetail> {
    return this.http.get<PropertyDetail>(`${this.base}/${id}`);
  }

  create(payload: CreatePropertyPayload, image: File | null): Observable<PropertyResponse> {
    return this.http.post<PropertyResponse>(this.base, toFormData(payload, image));
  }

  update(
    id: string,
    payload: Partial<CreatePropertyPayload>,
    image: File | null,
    removeImage = false,
  ): Observable<PropertyResponse> {
    return this.http.patch<PropertyResponse>(
      `${this.base}/${id}`,
      toFormData(payload, image, removeImage),
    );
  }

  archive(id: string): Observable<PropertyResponse> {
    return this.http.delete<PropertyResponse>(`${this.base}/${id}`);
  }
}

function toFormData(
  payload: Partial<CreatePropertyPayload>,
  image: File | null,
  removeImage = false,
): FormData {
  const form = new FormData();
  const { defaultRatePerSqm, ...rest } = payload;
  for (const [key, value] of Object.entries(rest)) {
    appendPropertyValue(form, key, value);
  }
  appendDefaultRatePerSqm(form, defaultRatePerSqm);
  if (image) form.append('image', image);
  else if (removeImage) form.append('removeImage', 'true');
  return form;
}

/** Multipart carries text only: numbers and booleans go as their string form ("true"/"false"). */
export function appendPropertyValue(
  form: FormData,
  key: string,
  value: string | number | boolean | null | undefined,
): void {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return;
  form.append(key, String(value));
}

export function appendDefaultRatePerSqm(form: FormData, rate: number | null | undefined): void {
  if (rate === undefined) return;
  form.append('defaultRatePerSqm', rate === null ? '' : String(rate));
}
