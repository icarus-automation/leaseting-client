import type { OrganizationProfile, OrganizationProfileDraft } from '../../../core/models/organization.types';

export interface OrganizationProfileDto {
  id?: string;
  name: string;
  addressLine?: string | null;
  city?: string | null;
}

export interface OrganizationProfilePatchBody {
  name: string;
  addressLine: string | null;
  city: string | null;
}

export function parseOrganizationProfile(dto: OrganizationProfileDto): OrganizationProfile {
  if (typeof dto.name !== 'string') {
    throw new Error('Organization name is required.');
  }

  return {
    id: dto.id ?? '',
    name: dto.name,
    addressLine: dto.addressLine ?? '',
    city: dto.city ?? '',
  };
}

export function toOrganizationProfilePatchBody(draft: OrganizationProfileDraft): OrganizationProfilePatchBody {
  const name = draft.name.trim();
  const addressLine = draft.addressLine.trim();
  const city = draft.city.trim();
  return {
    name,
    addressLine: addressLine || null,
    city: city || null,
  };
}
