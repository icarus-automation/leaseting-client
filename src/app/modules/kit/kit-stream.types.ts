import type { KitChatMessage } from './kit-chat.types';

/**
 * SSE names and payload fields from the ICA-6 FE note:
 * `started` / `delta` / `done` / `error`. Request body is `{ content }`.
 * Document poll statuses stay `PENDING` | `READY` | `FAILED`.
 */
export type KitSseEventName = 'started' | 'delta' | 'done' | 'error';

export interface KitSseStarted {
  conversationId?: string;
}

export interface KitSseDelta {
  text: string;
}

export interface KitSseDone {
  status: 'complete';
  conversationId: string;
  message: KitChatMessage;
}

export interface KitSseError {
  message: string;
}

export type KitStreamEvent =
  | ({ type: 'started' } & KitSseStarted)
  | ({ type: 'delta' } & KitSseDelta)
  | ({ type: 'done' } & KitSseDone);

export interface KitSseFrame {
  event: string;
  data: string;
}
