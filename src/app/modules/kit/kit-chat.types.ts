
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

/** Where a reply's words came from, such as a section of a Leaseting guide: opens in a new tab. */
export interface KitDocsSource {
  kind: 'docs';
  title: string;
  section: string | null;
  url: string;
}

/** A page of this app Kit points to: opens in place, through the router. */
export interface KitAppSource {
  kind: 'app';
  title: string;
  section: string | null;
  /** A relative route, like `/properties`. */
  route: string;
}

export type KitSource = KitDocsSource | KitAppSource;

export interface KitChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  /**
   * What an assistant reply cites. Its `[n]` markers in `content` point into
   * this list, 1-based. Missing from an API that predates sources.
   */
  sources?: KitSource[];
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
