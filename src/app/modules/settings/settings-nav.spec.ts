import type { Permission } from '../../core/auth/permissions';
import { SETTINGS_GROUPS, settingsSetupSteps, visibleSettingsGroups } from './settings-nav';

describe('SETTINGS_GROUPS general', () => {
  it('lists organization as a live card', () => {
    const general = SETTINGS_GROUPS.find((group) => group.label === 'General');
    expect(general?.cards.map((card) => card.route)).toEqual(['organization']);
    expect(general?.cards.every((card) => !card.comingSoon)).toBe(true);
  });
});

describe('SETTINGS_GROUPS team and access', () => {
  it('comes right after General', () => {
    expect(SETTINGS_GROUPS.map((group) => group.label).slice(0, 2)).toEqual(['General', 'Team & Access']);
  });

  it('opens Users and Roles & permissions', () => {
    const team = SETTINGS_GROUPS.find((group) => group.label === 'Team & Access');
    expect(team?.cards.map((card) => [card.route, card.permission, card.comingSoon ?? false])).toEqual([
      ['users', 'members:view', false],
      ['roles', 'roles:view', false],
    ]);
  });
});

describe('visibleSettingsGroups', () => {
  const holding = (...codes: Permission[]) => (code: Permission) => codes.includes(code);

  it('drops the cards a role cannot open, and groups left empty', () => {
    const groups = visibleSettingsGroups(holding('organization:view', 'parking:view'));

    expect(groups.map((group) => group.label)).toEqual(['General', 'Parking Management']);
    expect(groups[1].cards.map((card) => card.route)).toEqual([
      'vehicle-types',
      'rate-plans',
      'parking-rules',
      'parking-terminals',
    ]);
  });

  it('hides Users from anyone without members:view', () => {
    const routes = visibleSettingsGroups(holding('organization:view', 'roles:view')).flatMap((group) =>
      group.cards.map((card) => card.route),
    );

    expect(routes).not.toContain('users');
  });

  it('shows nothing to a role with no settings codes', () => {
    expect(visibleSettingsGroups(holding())).toEqual([]);
  });
});

describe('SETTINGS_GROUPS parking order', () => {
  it('lists parking config as vehicle types, rate plans, rules, terminals', () => {
    const parking = SETTINGS_GROUPS.find((group) => group.label === 'Parking Management');
    expect(parking?.cards.map((card) => card.route)).toEqual([
      'vehicle-types',
      'rate-plans',
      'parking-rules',
      'parking-terminals',
    ]);
    expect(parking?.cards.every((card) => !card.comingSoon)).toBe(true);
  });

  it('has no separate attendants page: attendants are managed on Users', () => {
    const routes = SETTINGS_GROUPS.flatMap((group) => group.cards.map((card) => card.route));
    expect(routes).not.toContain('parking-attendants');
  });
});

describe('SETTINGS_GROUPS property management', () => {
  it('lists late fees after charge items', () => {
    const property = SETTINGS_GROUPS.find((group) => group.label === 'Property Management');
    expect(property?.cards.map((card) => card.route)).toEqual([
      'property-types',
      'charge-items',
      'late-fees',
      'payment-destinations',
    ]);
    expect(property?.cards.every((card) => !card.comingSoon)).toBe(true);
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
