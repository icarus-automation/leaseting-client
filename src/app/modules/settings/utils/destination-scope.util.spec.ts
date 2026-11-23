import { destinationFixture } from '../../../shared/utils/payment-destination.fixture';
import {
  groupDestinationsByScope,
  nextDisplayOrder,
  ORGANIZATION_FALLBACK_LABEL,
  reorderedSiblings,
} from './destination-scope.util';

const names: Record<string, string> = { 'prop-b': 'Mariposa Residences', 'prop-a': 'Brickstone Boarding House' };
const propertyName = (id: string) => names[id] ?? 'Property';

describe('groupDestinationsByScope', () => {
  it('lists properties by name and puts the organization fallback last', () => {
    const groups = groupDestinationsByScope(
      [
        destinationFixture({ id: 'o', propertyId: null }),
        destinationFixture({ id: 'b', propertyId: 'prop-b' }),
        destinationFixture({ id: 'a', propertyId: 'prop-a' }),
      ],
      propertyName,
    );

    expect(groups.map((group) => group.label)).toEqual([
      'Brickstone Boarding House',
      'Mariposa Residences',
      ORGANIZATION_FALLBACK_LABEL,
    ]);
  });

  it('orders each group the way residents see it', () => {
    const [group] = groupDestinationsByScope(
      [
        destinationFixture({ id: 'second', displayOrder: 1 }),
        destinationFixture({ id: 'first', displayOrder: 0 }),
      ],
      propertyName,
    );

    expect(group.destinations.map((destination) => destination.id)).toEqual(['first', 'second']);
  });

  it('omits an empty organization group', () => {
    const groups = groupDestinationsByScope([destinationFixture({ propertyId: 'prop-a' })], propertyName);
    expect(groups).toHaveLength(1);
    expect(groups[0].propertyId).toBe('prop-a');
  });
});

describe('reorderedSiblings', () => {
  const siblings = [
    destinationFixture({ id: 'a', displayOrder: 0 }),
    destinationFixture({ id: 'b', displayOrder: 0 }),
    destinationFixture({ id: 'c', displayOrder: 0 }),
  ];

  it('renumbers every sibling, so destinations that share an order still move', () => {
    expect(reorderedSiblings(siblings, 'c', -1)).toEqual([
      { id: 'a', displayOrder: 0 },
      { id: 'c', displayOrder: 1 },
      { id: 'b', displayOrder: 2 },
    ]);
  });

  it('does nothing past either end', () => {
    expect(reorderedSiblings(siblings, 'a', -1)).toBeNull();
    expect(reorderedSiblings(siblings, 'c', 1)).toBeNull();
  });
});

describe('nextDisplayOrder', () => {
  it('places a new destination after the last one in its group', () => {
    const rows = [
      destinationFixture({ id: 'a', displayOrder: 2 }),
      destinationFixture({ id: 'b', displayOrder: 7, propertyId: 'prop-a' }),
    ];
    expect(nextDisplayOrder(rows, null)).toBe(3);
    expect(nextDisplayOrder(rows, 'prop-b')).toBe(0);
  });
});
