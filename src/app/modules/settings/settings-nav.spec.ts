import { SETTINGS_GROUPS } from './settings-nav';

describe('SETTINGS_GROUPS parking order', () => {
  it('lists parking config as vehicle types, rate plans, rules, terminals, attendants', () => {
    const parking = SETTINGS_GROUPS.find((group) => group.label === 'Parking Management');
    expect(parking?.cards.map((card) => card.route)).toEqual([
      'vehicle-types',
      'rate-plans',
      'parking-rules',
      'parking-terminals',
      'parking-attendants',
    ]);
    expect(parking?.cards.every((card) => !card.comingSoon)).toBe(true);
  });
});
