/**
 * The Settings index. One source of truth so the hub cards and each detail
 * page's header stay in step — add a section here and it appears in both.
 */
export interface SettingsCard {
  label: string;
  description: string;
  icon: string;
  /** Child path under /settings. Unused while `comingSoon` is set. */
  route: string;
  /** Listed so the shape of Settings is visible, but not built yet. */
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
        description: 'Company details, address, and branding.',
        icon: 'building',
        route: 'organization',
        comingSoon: true,
      },
    ],
  },
  {
    label: 'Property Management',
    cards: [
      {
        label: 'Property types',
        description: 'Categories offered when registering a property.',
        icon: 'home',
        route: 'property-types',
      },
      {
        label: 'Charge items',
        description: 'Rent and deposit lines you can put on a lease.',
        icon: 'money-bill',
        route: 'charge-items',
      },
      {
        label: 'Payment destinations',
        description: 'QR and account details tenants use to pay.',
        icon: 'qrcode',
        route: 'payment-destinations',
      },
    ],
  },
  {
    label: 'Parking Management',
    cards: [
      {
        label: 'Vehicle types',
        description: 'What can park — Car, Motorcycle, or your own list.',
        icon: 'car',
        route: 'vehicle-types',
      },
      {
        label: 'Rate plans',
        description: 'How each vehicle type is charged, including opening bands and overnight.',
        icon: 'calendar-clock',
        route: 'rate-plans',
      },
      {
        label: 'Parking rules',
        description: 'Grace, the default gate plan, and rounding.',
        icon: 'sliders-h',
        route: 'parking-rules',
      },
      {
        label: 'Terminals',
        description: 'Named handheld gates bound to a property.',
        icon: 'tablet',
        route: 'parking-terminals',
      },
      {
        label: 'Parking attendants',
        description: 'Handheld logins for guards. Nothing else in Leaseting accepts them.',
        icon: 'users',
        route: 'parking-attendants',
      },
    ],
  },
];

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

/** Pages that belong to a setup sequence shown under the Settings title. */
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
