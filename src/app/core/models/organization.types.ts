export interface OrganizationProfile {
  id: string;
  name: string;
  addressLine: string;
  city: string;
}

export type OrganizationProfileDraft = Pick<OrganizationProfile, 'name' | 'addressLine' | 'city'>;

export const ORGANIZATION_PROFILE_LIMITS = {
  name: { min: 2, max: 120 },
  addressLine: { max: 200 },
  city: { max: 80 },
} as const;
