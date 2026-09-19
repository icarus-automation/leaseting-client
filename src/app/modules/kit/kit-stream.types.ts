import type { KitChatMessage, KitConversationDetail } from './kit-chat.types';

/**
 * SSE names and payload fields from leaseting-api
 * `docs/fe-ask-kit-streaming-api.md` (ICA-6). Successful streams are not
 * Success-envelope wrapped; pre-stream errors stay ordinary JSON.
 */
export type KitSseEventName = 'started' | 'delta' | 'done' | 'error';

export interface KitSseStarted {
  conversationId: string;
  userMessage?: KitChatMessage;
}

export interface KitSseDelta {
  text: string;
}

export interface KitSseDone {
  status: 'complete';
  conversationId: string;
  message: KitChatMessage;
  userMessage?: KitChatMessage;
  conversation?: KitConversationDetail;
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
