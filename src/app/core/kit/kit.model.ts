/** Mirrors the backend's KitEventResponse (src/modules/kit/kit.service.ts). */

export type KitEventType = 'RENT_OVERDUE' | 'LEASE_EXPIRING' | 'UNIT_VACANT';

export type KitSeverity = 'INFO' | 'WARNING' | 'URGENT';

export interface KitEvent {
  id: string;
  type: KitEventType;
  severity: KitSeverity;
  /** Templated facts — always present, never AI-generated. */
  message: string;
  /** AI commentary — null whenever DeepSeek is unset or failed. */
  flavor: string | null;
  entityType: string;
  entityId: string;
  createdAt: string;
}

/** Which drawing Kit is wearing. Files live in `public/kit/`. */
export type KitMood = 'neutral' | 'concern' | 'sad' | 'happy' | 'thinking';

export const KIT_ART: Record<KitMood, string> = {
  neutral: '/kit/kit-neutral.png',
  concern: '/kit/kit-concern.png',
  sad: '/kit/kit-sad.png',
  happy: '/kit/kit-happy.png',
  thinking: '/kit/kit-thinking.png',
};

/** Purpose-drawn 1:1 head shots for the badge, where the full body is illegible. */
export const KIT_HEAD_ART: Record<KitMood, string> = {
  neutral: '/kit/square/kit-head-neutral.png',
  concern: '/kit/square/kit-head-concern.png',
  sad: '/kit/square/kit-head-sad.png',
  happy: '/kit/square/kit-head-happy.png',
  thinking: '/kit/square/kit-head-thinking.png',
};

/**
 * Severity labels. Kit's face is decorative reinforcement — the severity must
 * always also be readable as text, so colour/expression is never the only cue.
 */
export const KIT_SEVERITY_LABELS: Record<KitSeverity, string> = {
  URGENT: 'Needs attention now',
  WARNING: 'Coming up',
  INFO: 'Heads up',
};

export const KIT_SEVERITY_ICONS: Record<KitSeverity, string> = {
  URGENT: 'exclamation-circle',
  WARNING: 'clock',
  INFO: 'info-circle',
};

export interface KitEventLink {
  commands: string[];
}

/**
 * Where a card click lands. The backend already picked the destination that is
 * useful to act from — the tenant behind an overdue bill, the property behind
 * an idle unit — so this only maps it to a route.
 */
export function kitEventLink(event: KitEvent): KitEventLink {
  switch (event.entityType) {
    case 'Tenant':
      return { commands: ['/tenants', event.entityId] };
    case 'Property':
      return { commands: ['/properties', event.entityId] };
    default:
      return { commands: ['/dashboard'] };
  }
}
