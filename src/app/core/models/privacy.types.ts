/** Who published a notice version, as they were then. Null for Leaseting's starter. */
export interface PrivacyNoticePublisher {
  id: string | null;
  name: string | null;
  email: string | null;
}

export interface PrivacyNoticeVersionSummary {
  id: string;
  version: number;
  /** Leaseting's starter text, not yet replaced by the organization's own. */
  isStarter: boolean;
  publishedAt: string;
  publishedBy: PrivacyNoticePublisher | null;
}

export interface PrivacyNoticeVersionDetail extends PrivacyNoticeVersionSummary {
  body: string;
}

/** `GET /privacy-notice`: the current version, every version, and the public link. */
export interface PrivacyNotice {
  current: PrivacyNoticeVersionDetail;
  /** Newest first, without their text. */
  versions: PrivacyNoticeVersionSummary[];
  publicUrl: string;
  /** The current notice is still the starter: the owner should review it. */
  needsReview: boolean;
}

/** Enough to name and link the current notice. */
export interface CurrentPrivacyNotice {
  id: string;
  version: number;
  publishedAt: string;
  publicUrl: string;
}

/** `GET /public/privacy-notices/:slug`, read without signing in. */
export interface PublicPrivacyNotice {
  organization: { name: string; logo: string | null };
  version: number;
  publishedAt: string;
  body: string;
}

export type PrivacyConsentSource = 'STAFF_ATTESTED' | 'TENANT_APP';

export const PRIVACY_CONSENT_SOURCE_LABELS: Record<PrivacyConsentSource, string> = {
  STAFF_ATTESTED: 'Signed form, attested by staff',
  TENANT_APP: 'Agreed in Residence Care',
};

export interface PrivacyConsentItem {
  id: string;
  source: PrivacyConsentSource;
  noticeVersion: { id: string; version: number; publishedAt: string };
  recordedAt: string;
  /** The staff member who attested, or the tenant's own login. */
  recordedBy: PrivacyNoticePublisher | null;
  onboardingId: string | null;
}

/** `GET /residents/:id/privacy-consents`. */
export interface ResidentPrivacyConsents {
  currentNotice: CurrentPrivacyNotice;
  /** Consent to the current version, by source. Accepted when either is on record. */
  current: { accepted: boolean; staffAttestedAt: string | null; tenantAppAt: string | null };
  /** Newest first. */
  consents: PrivacyConsentItem[];
}

/** On an onboarding: the notice its consent step links, and what that step recorded. */
export interface OnboardingPrivacy {
  notice: CurrentPrivacyNotice;
  consent: {
    id: string;
    noticeVersion: number;
    recordedAt: string;
    recordedBy: PrivacyNoticePublisher | null;
  } | null;
}

/** The API's limits on a published notice. */
export const PRIVACY_NOTICE_LIMITS = { min: 40, max: 20000 } as const;
