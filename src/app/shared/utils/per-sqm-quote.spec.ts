import { describe, expect, it } from 'vitest';

import { appendPropertyField } from '../../modules/properties/services/properties.service';
import {
  formatPerSqmBreakdown,
  perSqmFieldErrors,
  previewPerSqm,
  starterRentFill,
  unitFormPayload,
} from './per-sqm-quote';

describe('previewPerSqm', () => {
  it('prices 45.5 sqm at 650 as 29575', () => {
    expect(
      previewPerSqm({
        floorAreaSqm: 45.5,
        ratePerSqmOverride: null,
        propertyDefaultRatePerSqm: 650,
      }),
    ).toEqual({ amount: 29575, areaSqm: 45.5, ratePerSqm: 650 });
  });

  it('rounds 1 sqm at 1.5 up to 2', () => {
    expect(
      previewPerSqm({
        floorAreaSqm: 1,
        ratePerSqmOverride: 1.5,
        propertyDefaultRatePerSqm: null,
      }),
    ).toEqual({ amount: 2, areaSqm: 1, ratePerSqm: 1.5 });
  });

  it('uses an override of 700 instead of the property default of 650', () => {
    expect(
      previewPerSqm({
        floorAreaSqm: 45.5,
        ratePerSqmOverride: 700,
        propertyDefaultRatePerSqm: 650,
      }),
    ).toEqual({ amount: 31850, areaSqm: 45.5, ratePerSqm: 700 });
  });

  it('uses an override of 0 instead of the property default', () => {
    expect(
      previewPerSqm({
        floorAreaSqm: 45.5,
        ratePerSqmOverride: 0,
        propertyDefaultRatePerSqm: 650,
      }),
    ).toEqual({ amount: 0, areaSqm: 45.5, ratePerSqm: 0 });
  });

  it('returns null when the area is missing', () => {
    expect(
      previewPerSqm({
        floorAreaSqm: null,
        ratePerSqmOverride: null,
        propertyDefaultRatePerSqm: 650,
      }),
    ).toBeNull();
  });

  it('does not fall through to the property default when the override is negative', () => {
    expect(
      previewPerSqm({
        floorAreaSqm: 45.5,
        ratePerSqmOverride: -1,
        propertyDefaultRatePerSqm: 650,
      }),
    ).toBeNull();
  });
});

describe('unitFormPayload', () => {
  it('sends asking rent for a fixed unit and leaves area and override off the body', () => {
    expect(
      unitFormPayload(
        {
          unitNo: '1A',
          notes: 'street side',
          pricingBasis: 'FIXED',
          monthlyRent: 8500,
          floorAreaSqm: 45.5,
          ratePerSqmOverride: 700,
        },
        650,
      ),
    ).toEqual({
      unitNo: '1A',
      notes: 'street side',
      pricingBasis: 'FIXED',
      monthlyRent: 8500,
    });
  });

  it('omits a null asking rent', () => {
    expect(
      unitFormPayload(
        {
          unitNo: '1A',
          notes: '',
          pricingBasis: 'FIXED',
          monthlyRent: null,
          floorAreaSqm: 45.5,
          ratePerSqmOverride: null,
        },
        null,
      ),
    ).toEqual({ unitNo: '1A', pricingBasis: 'FIXED' });
  });

  it('sends a null rate override for per sqm and leaves asking rent off the body', () => {
    expect(
      unitFormPayload(
        {
          unitNo: ' 1A ',
          notes: '',
          pricingBasis: 'PER_SQM',
          monthlyRent: null,
          floorAreaSqm: 45.5,
          ratePerSqmOverride: null,
        },
        650,
      ),
    ).toEqual({
      unitNo: '1A',
      pricingBasis: 'PER_SQM',
      floorAreaSqm: 45.5,
      ratePerSqmOverride: null,
    });
  });

  it('still omits asking rent when the form holds the preview amount', () => {
    expect(
      unitFormPayload(
        {
          unitNo: '1A',
          notes: '',
          pricingBasis: 'PER_SQM',
          monthlyRent: 29575,
          floorAreaSqm: 45.5,
          ratePerSqmOverride: null,
        },
        650,
      ),
    ).toEqual({
      unitNo: '1A',
      pricingBasis: 'PER_SQM',
      floorAreaSqm: 45.5,
      ratePerSqmOverride: null,
    });
  });

  it('returns null when a per-sqm field error is set', () => {
    expect(
      unitFormPayload(
        {
          unitNo: '1A',
          notes: '',
          pricingBasis: 'PER_SQM',
          monthlyRent: null,
          floorAreaSqm: null,
          ratePerSqmOverride: null,
        },
        null,
      ),
    ).toBeNull();
  });
});

describe('perSqmFieldErrors', () => {
  it('returns no field errors for a fixed unit', () => {
    expect(
      perSqmFieldErrors({
        pricingBasis: 'FIXED',
        floorAreaSqm: null,
        ratePerSqmOverride: null,
        propertyDefaultRatePerSqm: null,
      }),
    ).toEqual({ floorAreaSqm: null, ratePerSqmOverride: null });
  });

  it('names a missing area and a missing rate', () => {
    expect(
      perSqmFieldErrors({
        pricingBasis: 'PER_SQM',
        floorAreaSqm: null,
        ratePerSqmOverride: null,
        propertyDefaultRatePerSqm: null,
      }),
    ).toEqual({
      floorAreaSqm: 'Enter the floor area in square meters.',
      ratePerSqmOverride: 'Set a rate per sqm, or set a default rate on the property.',
    });
  });
});

describe('starterRentFill', () => {
  it('fills an empty Monthly Rent line from a per-sqm quote', () => {
    expect(
      starterRentFill({ pricingBasis: 'PER_SQM', computedMonthlyRent: 29575 }, [
        { name: 'Water', billType: 'WATER', amount: null },
        { name: 'Monthly Rent', billType: 'RENT', amount: null },
      ]),
    ).toEqual({ index: 1, amount: 29575 });
  });

  it('leaves a saved amount and a fixed unit alone', () => {
    expect(
      starterRentFill({ pricingBasis: 'PER_SQM', computedMonthlyRent: 29575 }, [
        { name: 'Monthly Rent', billType: 'RENT', amount: 30000 },
      ]),
    ).toBeNull();
    expect(
      starterRentFill({ pricingBasis: 'FIXED', computedMonthlyRent: 29575 }, [
        { name: 'Monthly Rent', billType: 'RENT', amount: null },
      ]),
    ).toBeNull();
  });
});

describe('formatPerSqmBreakdown', () => {
  it('prints the stored area, rate, and rent', () => {
    expect(
      formatPerSqmBreakdown({
        rentPricingBasis: 'PER_SQM',
        rentFloorAreaSqm: 45.5,
        rentRatePerSqm: 650,
        monthlyRent: '29575',
      }),
    ).toBe('45.5 sqm × ₱650 = ₱29,575');
  });

  it('prints the stored rent when it is not the area times the rate', () => {
    expect(
      formatPerSqmBreakdown({
        rentPricingBasis: 'PER_SQM',
        rentFloorAreaSqm: 45.5,
        rentRatePerSqm: 650,
        monthlyRent: '30000',
      }),
    ).toBe('45.5 sqm × ₱650 = ₱30,000');
  });

  it('returns null for a fixed lease', () => {
    expect(
      formatPerSqmBreakdown({
        rentPricingBasis: 'FIXED',
        rentFloorAreaSqm: 45.5,
        rentRatePerSqm: 650,
        monthlyRent: '8500',
      }),
    ).toBeNull();
  });
});

describe('appendPropertyField', () => {
  it('writes an empty field for a null rate, digits for a number, and omits undefined', () => {
    const cleared = new FormData();
    appendPropertyField(cleared, 'defaultRatePerSqm', null);
    expect(cleared.get('defaultRatePerSqm')).toBe('');

    const zero = new FormData();
    appendPropertyField(zero, 'defaultRatePerSqm', 0);
    expect(zero.get('defaultRatePerSqm')).toBe('0');

    const rate = new FormData();
    appendPropertyField(rate, 'defaultRatePerSqm', 650);
    expect(rate.get('defaultRatePerSqm')).toBe('650');

    const omitted = new FormData();
    appendPropertyField(omitted, 'defaultRatePerSqm', undefined);
    appendPropertyField(omitted, 'name', null);
    appendPropertyField(omitted, 'city', 'Quezon City');
    expect(omitted.has('defaultRatePerSqm')).toBe(false);
    expect(omitted.has('name')).toBe(false);
    expect(omitted.get('city')).toBe('Quezon City');
  });
});
