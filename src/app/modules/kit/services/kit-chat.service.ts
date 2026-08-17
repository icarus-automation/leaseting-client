import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import { SKIP_CACHE_HEADER } from '../../../core/http/cache.interceptor';
import type {
  KitChatMessage,
  KitConversationDetail,
  KitConversationSummary,
  KitDocumentTurn,
} from '../kit-chat.types';

@Injectable({ providedIn: 'root' })
export class KitChatService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/kit/conversations`;
  private readonly documents = `${API_BASE_URL}/kit/documents`;

  list(): Observable<KitConversationSummary[]> {
    return this.http.get<KitConversationSummary[]>(this.base);
  }

  get(id: string): Observable<KitConversationDetail> {
    return this.http.get<KitConversationDetail>(`${this.base}/${id}`);
  }

  /** Opens a conversation with its first question; the reply comes back with it. */
  start(content: string): Observable<KitConversationDetail> {
    return this.http.post<KitConversationDetail>(this.base, { content });
  }

  send(id: string, content: string): Observable<KitChatMessage> {
    return this.http.post<KitChatMessage>(`${this.base}/${id}/messages`, { content });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** One poll of a generating document — never served from the GET cache. */
  pollDocument(id: string): Observable<KitDocumentTurn> {
    return this.http.get<KitDocumentTurn>(`${this.documents}/${id}`, {
      headers: new HttpHeaders({ [SKIP_CACHE_HEADER]: '1' }),
    });
  }

  /**
   * Authenticated download link. Plain navigation rather than a blob fetch, so
   * the session cookie rides along — same approach as the SOA download.
   */
  downloadUrl(id: string): string {
    return `${this.documents}/${id}/download`;
  }
}
