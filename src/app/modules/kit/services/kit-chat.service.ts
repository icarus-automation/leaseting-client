import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subscriber } from 'rxjs';

import { API_BASE_URL } from '../../../core/config/api';
import { SKIP_CACHE_HEADER } from '../../../core/http/cache.interceptor';
import type {
  KitChatMessage,
  KitConversationDetail,
  KitConversationSummary,
  KitDocumentTurn,
} from '../kit-chat.types';
import { decodeKitSseFrame, splitSseFrames } from '../kit-sse.util';
import type { KitStreamEvent } from '../kit-stream.types';

@Injectable({ providedIn: 'root' })
export class KitChatService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${API_BASE_URL}/kit/conversations`;
  private readonly documents = `${API_BASE_URL}/kit/documents`;

  list(): Observable<KitConversationSummary[]> {
    return this.http.get<KitConversationSummary[]>(this.base);
  }

  get(id: string): Observable<KitConversationDetail> {
    return this.http.get<KitConversationDetail>(`${this.base}/${id}`);
  }

  start(content: string): Observable<KitConversationDetail> {
    return this.http.post<KitConversationDetail>(this.base, { content });
  }

  send(id: string, content: string): Observable<KitChatMessage> {
    return this.http.post<KitChatMessage>(`${this.base}/${id}/messages`, { content });
  }

  streamStart(content: string): Observable<KitStreamEvent> {
    return this.stream(`${this.base}/stream`, content);
  }

  streamFollowUp(id: string, content: string): Observable<KitStreamEvent> {
    return this.stream(`${this.base}/${id}/messages/stream`, content);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  refineDocument(id: string, content: string): Observable<KitChatMessage> {
    return this.http.post<KitChatMessage>(`${this.documents}/${id}/refine`, { content });
  }

  pollDocument(id: string): Observable<KitDocumentTurn> {
    return this.http.get<KitDocumentTurn>(`${this.documents}/${id}`, {
      headers: new HttpHeaders({ [SKIP_CACHE_HEADER]: '1' }),
    });
  }

  downloadUrl(id: string): string {
    return `${this.documents}/${id}/download`;
  }

  private stream(url: string, content: string): Observable<KitStreamEvent> {
    return new Observable((subscriber) => {
      const controller = new AbortController();
      void this.consume(url, content, controller.signal, subscriber);
      return () => controller.abort();
    });
  }

  private async consume(
    url: string,
    content: string,
    signal: AbortSignal,
    subscriber: Subscriber<KitStreamEvent>,
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        signal,
      });
    } catch (error) {
      if (signal.aborted || isAbort(error)) {
        if (!subscriber.closed) subscriber.complete();
        return;
      }
      if (!subscriber.closed) {
        subscriber.error(
          new HttpErrorResponse({
            status: 0,
            statusText: 'Unknown Error',
            url,
            error,
          }),
        );
      }
      return;
    }

    if (!response.ok) {
      const failure = await httpErrorFromResponse(response, url);
      this.redirectIfUnauthorized(failure.status);
      if (!subscriber.closed) subscriber.error(failure);
      return;
    }

    if (!response.body) {
      if (!subscriber.closed) {
        subscriber.error(
          new HttpErrorResponse({
            status: 502,
            statusText: 'Bad Gateway',
            url,
            error: { message: 'Kit sent a reply Kit could not read.' },
          }),
        );
      }
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finished = false;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const split = splitSseFrames(buffer);
        buffer = split.rest;
        if (emitFrames(split.frames, subscriber, url)) {
          finished = true;
          break;
        }
      }

      if (!finished && !signal.aborted) {
        buffer += decoder.decode();
        const split = splitSseFrames(buffer.endsWith('\n\n') ? buffer : `${buffer}\n\n`);
        if (emitFrames(split.frames, subscriber, url)) finished = true;
      }
    } catch (error) {
      if (signal.aborted || isAbort(error)) {
        if (!subscriber.closed) subscriber.complete();
        return;
      }
      if (!subscriber.closed) {
        subscriber.error(
          new HttpErrorResponse({
            status: 502,
            statusText: 'Bad Gateway',
            url,
            error: { message: error instanceof Error ? error.message : 'Kit could not finish that reply.' },
          }),
        );
      }
      return;
    }

    if (subscriber.closed) return;
    if (signal.aborted) {
      subscriber.complete();
      return;
    }
    if (!finished) {
      subscriber.error(
        new HttpErrorResponse({
          status: 502,
          statusText: 'Bad Gateway',
          url,
          error: { message: 'Kit stopped before finishing that reply.' },
        }),
      );
      return;
    }
    subscriber.complete();
  }

  private redirectIfUnauthorized(status: number): void {
    if (status !== 401 || this.router.url.startsWith('/login')) return;
    void this.router.navigateByUrl('/login');
  }
}

function emitFrames(
  frames: { event: string; data: string }[],
  subscriber: Subscriber<KitStreamEvent>,
  url: string,
): boolean {
  for (const frame of frames) {
    if (subscriber.closed) return true;
    const decoded = decodeKitSseFrame(frame);
    if (!decoded) continue;
    if ('error' in decoded) {
      subscriber.error(
        new HttpErrorResponse({
          status: 502,
          statusText: 'Bad Gateway',
          url,
          error: { message: decoded.error },
        }),
      );
      return true;
    }
    subscriber.next(decoded.event);
    if (decoded.event.type === 'done') return true;
  }
  return false;
}

async function httpErrorFromResponse(response: Response, url: string): Promise<HttpErrorResponse> {
  let error: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      error = JSON.parse(text) as unknown;
    } catch {
      error = { message: text };
    }
  }
  return new HttpErrorResponse({
    status: response.status,
    statusText: response.statusText,
    url,
    error,
  });
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
