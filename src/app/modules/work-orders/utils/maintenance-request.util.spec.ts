import {
  nextRequestAction,
  photoCountLabel,
  requestEmptyState,
  requestStatusBadge,
  requestTenantName,
  requestUnitLabel,
  viewStatus,
} from './maintenance-request.util';

describe('requestStatusBadge', () => {
  it('gives Open the warning tone, since it is the one waiting on someone', () => {
    expect(requestStatusBadge('OPEN')).toEqual({ label: 'Open', tone: 'warning' });
  });

  it('labels In progress and Resolved', () => {
    expect(requestStatusBadge('IN_PROGRESS')).toEqual({ label: 'In progress', tone: 'neutral' });
    expect(requestStatusBadge('RESOLVED')).toEqual({ label: 'Resolved', tone: 'success' });
  });
});

describe('nextRequestAction', () => {
  it('only moves forward: Start from Open, Resolve from In progress', () => {
    expect(nextRequestAction('OPEN')).toBe('start');
    expect(nextRequestAction('IN_PROGRESS')).toBe('resolve');
  });

  it('offers nothing once a request is resolved', () => {
    expect(nextRequestAction('RESOLVED')).toBeNull();
  });
});

describe('viewStatus', () => {
  it('sends the tab status, and no status for All', () => {
    expect(viewStatus('OPEN')).toBe('OPEN');
    expect(viewStatus('RESOLVED')).toBe('RESOLVED');
    expect(viewStatus('ALL')).toBeUndefined();
  });
});

describe('request labels', () => {
  const request = {
    tenant: { id: 't-1', firstName: 'Ace Gabriel', lastName: 'Pasiliao' },
    unit: { id: 'u-1', unitNo: '106', property: { id: 'p-1', name: 'Brickstone Boarding House' } },
  };

  it('names the tenant and the unit with its property', () => {
    expect(requestTenantName(request)).toBe('Ace Gabriel Pasiliao');
    expect(requestUnitLabel(request)).toBe('Unit 106 · Brickstone Boarding House');
  });

  it('counts photos in words', () => {
    expect(photoCountLabel(1)).toBe('1 photo');
    expect(photoCountLabel(3)).toBe('3 photos');
  });
});

describe('requestEmptyState', () => {
  it('explains each tab', () => {
    expect(requestEmptyState('OPEN', false).heading).toBe('No open requests');
    expect(requestEmptyState('IN_PROGRESS', false).heading).toBe('Nothing in progress');
    expect(requestEmptyState('RESOLVED', false).heading).toBe('No resolved requests');
    expect(requestEmptyState('ALL', false).heading).toBe('No maintenance requests yet');
  });

  it('points a property-filtered tab at the other properties', () => {
    expect(requestEmptyState('OPEN', true).description).toContain('All properties');
  });
});
