import type { OrganizationProfile, OrganizationProfileDraft } from '../../../core/models/organization.types';

interface OrganizationProfileDto {
  id?: unknown;
  name?: unknown;
  addressLine?: unknown;
  city?: unknown;
}

function asDto(value: unknown): OrganizationProfileDto | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as OrganizationProfileDto;
}

export function parseOrganizationProfile(value: unknown): OrganizationProfile {
  const dto = asDto(value);
  if (typeof dto?.name !== 'string') {
    throw new Error('Organization name is required.');
  }

  return {
    id: typeof dto.id === 'string' ? dto.id : '',
    name: dto.name,
    addressLine: typeof dto.addressLine === 'string' ? dto.addressLine : '',
    city: typeof dto.city === 'string' ? dto.city : '',
  };
}

export function toOrganizationProfilePatchBody(draft: OrganizationProfileDraft): {
  name: string;
  addressLine: string | null;
  city: string | null;
} {
  const name = draft.name.trim();
  const addressLine = draft.addressLine.trim();
  const city = draft.city.trim();
  return {
    name,
    addressLine: addressLine || null,
    city: city || null,
  };
}
