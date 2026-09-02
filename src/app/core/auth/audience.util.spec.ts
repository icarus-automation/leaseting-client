import { audienceOf, dedicatedAppRejection } from './audience.util';

describe('audienceOf', () => {
  it('reads the audience the API reports', () => {
    expect(audienceOf({ audience: 'parking', organizationRole: null })).toBe('parking');
  });

  it('falls back to the organization role when the audience is missing', () => {
    expect(audienceOf({ audience: undefined, organizationRole: 'parking_attendant' })).toBe('parking');
  });

  it('treats an unknown role as staff', () => {
    expect(audienceOf({ audience: undefined, organizationRole: 'admin' })).toBe('staff');
  });
});

describe('dedicatedAppRejection', () => {
  it('sends a tenant to Residence Care', () => {
    expect(dedicatedAppRejection({ audience: 'tenant', organizationRole: null })).toBe(
      'Use the Residence Care mobile app.',
    );
  });

  it('rejects the tenant organization role even when the audience says staff', () => {
    expect(dedicatedAppRejection({ audience: 'staff', organizationRole: 'tenant' })).toBe(
      'Use the Residence Care mobile app.',
    );
  });

  it('sends a parking attendant to the terminal', () => {
    expect(dedicatedAppRejection({ audience: 'parking', organizationRole: 'parking_attendant' })).toBe(
      'Use the Leaseting Parking Terminal.',
    );
  });

  it('rejects the parking attendant role even when the audience says staff', () => {
    expect(dedicatedAppRejection({ audience: 'staff', organizationRole: 'parking_attendant' })).toBe(
      'Use the Leaseting Parking Terminal.',
    );
  });

  it('lets staff through', () => {
    expect(dedicatedAppRejection({ audience: 'staff', organizationRole: 'admin' })).toBeNull();
  });
});
