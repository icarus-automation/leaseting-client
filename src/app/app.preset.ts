import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const AppPreset = definePreset(Aura, {
  primitive: {
    /*
     * Aura's stock red is #ef4444, which is a different red from the app's
     * --destructive and only reaches 3.76:1 against white text, under the AA
     * minimum this project holds itself to. Re-anchoring the ramp on the theme
     * token (500 = --destructive, 100 = --muted-destructive, both from
     * styles.css) puts PrimeNG's destructive surfaces on the same red as every
     * badge, figure, and button the app draws itself, and takes white-on-500
     * to 5.6:1. Reaches: confirm dialog accept buttons, error toasts, and the
     * invalid-field border on PrimeNG inputs.
     */
    red: {
      50:  'oklch(0.97 0.018 15)',
      100: 'oklch(0.94 0.040 15)',
      200: 'oklch(0.88 0.075 15)',
      300: 'oklch(0.77 0.130 15)',
      400: 'oklch(0.66 0.185 15)',
      500: 'oklch(0.54 0.220 15)',
      600: 'oklch(0.48 0.205 15)',
      700: 'oklch(0.42 0.185 15)',
      800: 'oklch(0.35 0.155 15)',
      900: 'oklch(0.28 0.125 15)',
      950: 'oklch(0.20 0.090 15)',
    },
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
