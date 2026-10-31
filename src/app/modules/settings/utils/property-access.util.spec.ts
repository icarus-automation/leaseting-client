import { FormControl } from '@angular/forms';

import { EVERY_PROPERTY, type PropertyAccess } from '../../../core/models/property-access.types';
import {
  EVERY_PROPERTY_VALUE,
  coversProperties,
  pickerValueOf,
  propertyAccessSummary,
  propertyAccessValidator,
  toPropertyIds,
} from './property-access.util';

function limitedTo(...names: string[]): PropertyAccess {
  const properties = names.map((name) => ({ id: `p-${name}`, name, isArchived: false }));
  return { isLimited: true, propertyIds: properties.map((property) => property.id), properties };
}

describe('toPropertyIds', () => {
  it('sends an empty list for every property, and the picked ids otherwise', () => {
    expect(toPropertyIds(EVERY_PROPERTY_VALUE)).toEqual([]);
    expect(toPropertyIds({ everyProperty: true, propertyIds: ['p-1'] })).toEqual([]);
    expect(toPropertyIds({ everyProperty: false, propertyIds: ['p-1', 'p-2'] })).toEqual(['p-1', 'p-2']);
  });
});

describe('pickerValueOf', () => {
  it('starts someone without limits on every property', () => {
    expect(pickerValueOf(EVERY_PROPERTY)).toEqual(EVERY_PROPERTY_VALUE);
  });

  it('drops archived properties, which cannot be given again', () => {
    const access: PropertyAccess = {
      isLimited: true,
      propertyIds: ['p-1', 'p-2'],
      properties: [
        { id: 'p-1', name: 'Brickstone', isArchived: false },
        { id: 'p-2', name: 'Old Mill', isArchived: true },
      ],
    };

    expect(pickerValueOf(access)).toEqual({ everyProperty: false, propertyIds: ['p-1'] });
  });

  it('keeps ids the viewer cannot see, so a save does not drop them', () => {
    const access: PropertyAccess = { ...limitedTo('Brickstone'), propertyIds: ['p-Brickstone', 'p-hidden'] };

    expect(pickerValueOf(access)).toEqual({ everyProperty: false, propertyIds: ['p-Brickstone', 'p-hidden'] });
  });
});

describe('propertyAccessValidator', () => {
  it('wants at least one property once Specific properties is chosen', () => {
    expect(propertyAccessValidator(new FormControl(EVERY_PROPERTY_VALUE))).toBeNull();
    expect(propertyAccessValidator(new FormControl({ everyProperty: false, propertyIds: [] }))).toEqual({
      propertiesRequired: true,
    });
    expect(propertyAccessValidator(new FormControl({ everyProperty: false, propertyIds: ['p-1'] }))).toBeNull();
  });
});

describe('propertyAccessSummary', () => {
  it('reads no limits as all properties, with no tooltip', () => {
    expect(propertyAccessSummary(EVERY_PROPERTY)).toEqual({ label: 'All properties', names: null });
  });

  it('counts the properties and marks the archived ones', () => {
    const access: PropertyAccess = {
      isLimited: true,
      propertyIds: ['p-1', 'p-2'],
      properties: [
        { id: 'p-1', name: 'Brickstone', isArchived: false },
        { id: 'p-2', name: 'Old Mill', isArchived: true },
      ],
    };

    expect(propertyAccessSummary(access)).toEqual({ label: '2 properties', names: 'Brickstone, Old Mill (archived)' });
  });
});

describe('coversProperties', () => {
  it('lets someone without limits give anything, every property included', () => {
    expect(coversProperties(EVERY_PROPERTY, [])).toBe(true);
    expect(coversProperties(EVERY_PROPERTY, ['p-anything'])).toBe(true);
  });

  it('keeps someone limited to their own properties, and away from every property', () => {
    const actor = limitedTo('Brickstone', 'Harbor');

    expect(coversProperties(actor, ['p-Brickstone'])).toBe(true);
    expect(coversProperties(actor, ['p-Brickstone', 'p-Harbor'])).toBe(true);
    expect(coversProperties(actor, ['p-Brickstone', 'p-Sunrise'])).toBe(false);
    expect(coversProperties(actor, [])).toBe(false);
  });
});
