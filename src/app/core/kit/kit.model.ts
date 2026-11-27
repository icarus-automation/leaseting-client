
export type KitEventType = 'RENT_OVERDUE' | 'LEASE_EXPIRING' | 'UNIT_VACANT';

export type KitSeverity = 'INFO' | 'WARNING' | 'URGENT';

export interface KitEvent {
  id: string;
  type: KitEventType;
  severity: KitSeverity;
  message: string;
  flavor: string | null;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export type KitMood = 'neutral' | 'concern' | 'sad' | 'happy' | 'thinking';

export const KIT_ART: Record<KitMood, string> = {
  neutral: '/kit/kit-neutral.webp',
  concern: '/kit/kit-concern.webp',
  sad: '/kit/kit-sad.webp',
  happy: '/kit/kit-happy.webp',
  thinking: '/kit/kit-thinking.webp',
};

export const KIT_HEAD_ART: Record<KitMood, string> = {
  neutral: '/kit/square/kit-head-neutral.webp',
  concern: '/kit/square/kit-head-concern.webp',
  sad: '/kit/square/kit-head-sad.webp',
  happy: '/kit/square/kit-head-happy.webp',
  thinking: '/kit/square/kit-head-thinking.webp',
};

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

export const KIT_SEVERITY_TONES: Record<KitSeverity, string> = {
  URGENT: 'text-destructive',
  WARNING: 'text-warning',
  INFO: 'text-primary',
};

export interface KitEventLink {
  commands: string[];
}

export function kitEventLink(event: KitEvent): KitEventLink {
  switch (event.entityType) {
    case 'Resident':
      return { commands: ['/residents', event.entityId] };
    case 'Property':
      return { commands: ['/properties', event.entityId] };
    default:
      return { commands: ['/dashboard'] };
  }
}
