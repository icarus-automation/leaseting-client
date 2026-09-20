import {
  parseOrganizationProfile,
  toOrganizationProfilePatchBody,
} from './organization-profile.util';

describe('parseOrganizationProfile', () => {
  it('turns null and missing address fields into empty strings', () => {
    expect(
      parseOrganizationProfile({
        id: 'org-1',
        name: 'Acme Rentals',
        addressLine: null,
        city: null,
      }),
    ).toEqual({
      id: 'org-1',
      name: 'Acme Rentals',
      addressLine: '',
      city: '',
    });

    expect(parseOrganizationProfile({ id: 'org-1', name: 'Acme Rentals' })).toEqual({
      id: 'org-1',
      name: 'Acme Rentals',
      addressLine: '',
      city: '',
    });
  });

  it('uses an empty id when the wire omits it', () => {
    expect(parseOrganizationProfile({ name: 'Acme Rentals' })).toEqual({
      id: '',
      name: 'Acme Rentals',
      addressLine: '',
      city: '',
    });
  });

  it('ignores extra wire keys', () => {
    expect(
      parseOrganizationProfile({
        id: 'org-1',
        name: 'Acme Rentals',
        addressLine: '12 Osmeña Blvd',
        city: 'Cebu City',
        slug: 'acme',
        logoUrl: 'https://cdn.example/logo.png',
      }),
    ).toEqual({
      id: 'org-1',
      name: 'Acme Rentals',
      addressLine: '12 Osmeña Blvd',
      city: 'Cebu City',
    });
  });

  it('rejects a payload whose name is not a string', () => {
    expect(() => parseOrganizationProfile({})).toThrow('Organization name is required.');
    expect(() => parseOrganizationProfile({ name: 12 })).toThrow('Organization name is required.');
    expect(() => parseOrganizationProfile(null)).toThrow('Organization name is required.');
  });
});

describe('toOrganizationProfilePatchBody', () => {
  it('trims every field and never nulls name', () => {
    expect(
      toOrganizationProfilePatchBody({
        name: '  Acme Rentals  ',
        addressLine: '  12 Osmeña Blvd  ',
        city: '  Cebu City  ',
      }),
    ).toEqual({
      name: 'Acme Rentals',
      addressLine: '12 Osmeña Blvd',
      city: 'Cebu City',
    });

    expect(
      toOrganizationProfilePatchBody({
        name: '   ',
        addressLine: '12 Osmeña Blvd',
        city: 'Cebu City',
      }),
    ).toEqual({
      name: '',
      addressLine: '12 Osmeña Blvd',
      city: 'Cebu City',
    });
  });

  it('sends blank address fields as null', () => {
    expect(
      toOrganizationProfilePatchBody({
        name: 'Acme Rentals',
        addressLine: '',
        city: '   ',
      }),
    ).toEqual({
      name: 'Acme Rentals',
      addressLine: null,
      city: null,
    });
  });
});

describe('parse ∘ serialize', () => {
  it('round-trips a clean draft', () => {
    const draft = {
      name: 'Acme Rentals',
      addressLine: '12 Osmeña Blvd',
      city: 'Cebu City',
    };

    expect(parseOrganizationProfile(toOrganizationProfilePatchBody(draft))).toEqual({
      id: '',
      ...draft,
    });
  });
});
