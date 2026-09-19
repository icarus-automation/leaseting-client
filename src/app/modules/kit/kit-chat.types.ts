
export interface KitConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export type KitDocumentStatus = 'PENDING' | 'READY' | 'FAILED';
export type KitDocumentFormat = 'PDF' | 'XLSX';

export interface KitDocument {
  id: string;
  status: KitDocumentStatus;
  format: KitDocumentFormat | null;
  title: string;
  fileName: string | null;
  error: string | null;
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

export interface KitDocumentTurn {
  messageId: string;
  content: string;
  document: KitDocument;
}
