import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const AppPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs:   '2px',
      sm:   '4px',
      md:   '4px',
      lg:   '4px',
      xl:   '6px',
      '2xl':'6px',
      round:'50%',
      full: '9999px',
    },
  },
  semantic: {
    primary: {
      50:  'oklch(0.95 0.030 262)',
      100: 'oklch(0.90 0.060 262)',
      200: 'oklch(0.83 0.090 262)',
      300: 'oklch(0.74 0.120 262)',
      400: 'oklch(0.63 0.150 262)',
      500: 'oklch(0.50 0.160 262)',
      600: 'oklch(0.44 0.160 262)',
      700: 'oklch(0.38 0.150 262)',
      800: 'oklch(0.31 0.130 262)',
      900: 'oklch(0.24 0.100 262)',
      950: 'oklch(0.17 0.080 262)',
    },
    colorScheme: {
      light: {
        primary: {
          color:         '{primary.500}',
          contrastColor: '#ffffff',
          hoverColor:    '{primary.600}',
          activeColor:   '{primary.700}',
        },
        highlight: {
          background:      '{primary.50}',
          focusBackground: '{primary.100}',
          color:           '{primary.700}',
          focusColor:      '{primary.800}',
        },
        surface: {
          0:   'oklch(1.000 0.000 0)',
          50:  'oklch(0.975 0.005 262)',
          100: 'oklch(0.955 0.008 262)',
          200: 'oklch(0.920 0.010 262)',
          300: 'oklch(0.880 0.012 262)',
          400: 'oklch(0.820 0.014 262)',
          500: 'oklch(0.720 0.015 262)',
          600: 'oklch(0.600 0.015 262)',
          700: 'oklch(0.460 0.015 262)',
          800: 'oklch(0.320 0.012 262)',
          900: 'oklch(0.220 0.010 262)',
          950: 'oklch(0.140 0.008 262)',
        },
      },
    },
  },
});
