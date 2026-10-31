import type { Permission } from '../../core/auth/permissions';

export interface SettingsCard {
  label: string;
  description: string;
  icon: string;
  route: string;
  permission: Permission;
  comingSoon?: boolean;
}

export interface SettingsGroup {
  label: string;
  cards: SettingsCard[];
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    label: 'General',
    cards: [
      {
        label: 'Organization',
        description: 'Company name, address, and branding.',
        icon: 'building',
        route: 'organization',
        permission: 'organization:view',
      },
    ],
  },
  {
    label: 'Team & Access',
    cards: [
      {
        label: 'Users',
        description: 'Every login: staff, tenants, and parking attendants.',
        icon: 'users',
        route: 'users',
        permission: 'members:view',
      },
      {
        label: 'Roles & permissions',
        description: 'Custom roles and the permissions each one grants.',
        icon: 'shield',
        route: 'roles',
        permission: 'roles:view',
      },
    ],
  },
  {
    label: 'Property Management',
    cards: [
      {
        label: 'Property types',
        description: 'Categories used when you add a property.',
        icon: 'home',
        route: 'property-types',
        permission: 'properties:view',
      },
      {
        label: 'Charge items',
        description: 'Rent and deposit lines you can add to a lease.',
        icon: 'money-bill',
        route: 'charge-items',
        permission: 'bills:view',
      },
      {
        label: 'Late fees',
        description: 'Charge a late fee on unpaid rent after a grace period.',
        icon: 'clock',
        route: 'late-fees',
        permission: 'bills:view',
      },
      {
        label: 'Payment destinations',
        description: 'QR and account details tenants use to pay.',
        icon: 'qrcode',
        route: 'payment-destinations',
        permission: 'payments:view',
      },
    ],
  },
  {
    label: 'Parking Management',
    cards: [
      {
        label: 'Vehicle types',
        description: 'Car, motorcycle, or your own list.',
        icon: 'car',
        route: 'vehicle-types',
        permission: 'parking:view',
      },
      {
        label: 'Rate plans',
        description: 'Charges by vehicle type, including opening bands and overnight.',
        icon: 'calendar-clock',
        route: 'rate-plans',
        permission: 'parking:view',
      },
      {
        label: 'Parking rules',
        description: 'Grace minutes, default rate plan, and rounding.',
        icon: 'sliders-h',
        route: 'parking-rules',
        permission: 'parking:view',
      },
      {
        label: 'Terminals',
        description: 'Named handhelds, each bound to a property.',
        icon: 'tablet',
        route: 'parking-terminals',
        permission: 'parking:view',
      },
    ],
  },
];

export function visibleSettingsGroups(can: (code: Permission) => boolean): SettingsGroup[] {
  return SETTINGS_GROUPS.map((group) => ({
    ...group,
    cards: group.cards.filter((card) => can(card.permission)),
  })).filter((group) => group.cards.length > 0);
}

export function findSettingsCard(route: string): SettingsCard | null {
  for (const group of SETTINGS_GROUPS) {
    const card = group.cards.find((candidate) => candidate.route === route);
    if (card) return card;
  }
  return null;
}

export interface SettingsSetupStep {
  label: string;
  route: string;
}

const SETTINGS_SETUP_CHAPTERS: { routes: string[]; steps: SettingsSetupStep[] }[] = [
  {
    routes: ['vehicle-types', 'rate-plans', 'parking-rules'],
    steps: [
      { label: 'Vehicle types', route: 'vehicle-types' },
      { label: 'Rate plans', route: 'rate-plans' },
      { label: 'Parking rules', route: 'parking-rules' },
    ],
  },
];

export function settingsSetupSteps(route: string): SettingsSetupStep[] | null {
  return SETTINGS_SETUP_CHAPTERS.find((chapter) => chapter.routes.includes(route))?.steps ?? null;
}
