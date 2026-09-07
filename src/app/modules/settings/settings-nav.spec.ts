import { SETTINGS_GROUPS, settingsSetupSteps } from './settings-nav';

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

describe('settingsSetupSteps', () => {
  it('chains vehicle types, rate plans, and parking rules', () => {
    expect(settingsSetupSteps('rate-plans')?.map((step) => step.route)).toEqual([
      'vehicle-types',
      'rate-plans',
      'parking-rules',
    ]);
    expect(settingsSetupSteps('charge-items')).toBeNull();
  });
});
