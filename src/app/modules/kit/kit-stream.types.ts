import type { KitChatMessage } from './kit-chat.types';

export type KitSseEventName = 'started' | 'delta' | 'done' | 'error';

export interface KitSseStarted {
  conversationId?: string;
}

export interface KitSseDelta {
  text: string;
}

export interface KitSseDone {
  status: 'complete';
  conversationId?: string;
  /** The first reply of the turn. */
  message: KitChatMessage;
  /** Every reply of the turn: a letter to several tenants comes back as one file each. */
  messages?: KitChatMessage[];
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
