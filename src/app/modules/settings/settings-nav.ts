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
        description: 'The categories offered when registering a property.',
        icon: 'home',
        route: 'property-types',
      },
      {
        label: 'Charge items',
        description: 'The rent and deposit lines you can put on a lease.',
        icon: 'money-bill',
        route: 'charge-items',
      },
      {
        label: 'Payment destinations',
        description: 'QR and account details tenants use to pay. Property-specific first, then organization fallback.',
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
        description: 'The categories a vehicle is filed under when it parks.',
        icon: 'car',
        route: 'vehicle-types',
      },
      {
        label: 'Rate plans',
        description: 'Hourly, daily, weekly, and monthly charges, priced per vehicle type.',
        icon: 'calendar-clock',
        route: 'rate-plans',
      },
      {
        label: 'Parking attendants',
        description: 'Terminal logins for the guards on the handheld. Nothing else in Leaseting accepts them.',
        icon: 'users',
        route: 'parking-attendants',
      },
      {
        label: 'Parking rules',
        description: 'Set grace periods, lost ticket fees, and access rules.',
        icon: 'sliders-h',
        route: 'parking-rules',
        comingSoon: true,
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
