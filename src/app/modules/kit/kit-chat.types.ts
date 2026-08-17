/** Mirrors the backend's KitChatService responses. */

export interface KitConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export type KitDocumentStatus = 'PENDING' | 'READY' | 'FAILED';
export type KitDocumentFormat = 'PDF' | 'XLSX';

/** A file produced by a `/document` turn. Null format until Kit picks one. */
export interface KitDocument {
  id: string;
  status: KitDocumentStatus;
  format: KitDocumentFormat | null;
  title: string;
  fileName: string | null;
  error: string | null;
  /** The bytes are held server-side only until this passes. */
  expiresAt: string;
}

export interface KitChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
  document?: KitDocument | null;
}

export interface KitConversationDetail extends KitConversationSummary {
  messages: KitChatMessage[];
}

/**
 * One poll of a generating document. Carries the assistant turn's text too —
 * the placeholder is replaced by Kit's own line at the moment the file lands.
 */
export interface KitDocumentTurn {
  messageId: string;
  content: string;
  document: KitDocument;
}
