import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import type { AccessCatalog } from '../../../core/models/access-catalog.types';

@Injectable({ providedIn: 'root' })
export class AccessCatalogService {
  private readonly http = inject(HttpClient);
  private catalog$: Observable<AccessCatalog> | null = null;

  /** The catalog only changes with a deploy, so one fetch serves the session. A failure is retried next time. */
  catalog(): Observable<AccessCatalog> {
    this.catalog$ ??= this.http.get<AccessCatalog>(`${API_BASE_URL}/access/catalog`).pipe(
      catchError((error: unknown) => {
        this.catalog$ = null;
        return throwError(() => error);
      }),
      shareReplay(1),
    );
    return this.catalog$;
  }
}
