import { ActivatedRouteSnapshot } from '@angular/router';

import { contentWidthFromSnapshot } from './content-width';

function snapshot(
  data: Record<string, unknown> = {},
  firstChild: ActivatedRouteSnapshot | null = null,
): ActivatedRouteSnapshot {
  return { data, firstChild } as ActivatedRouteSnapshot;
}

describe('contentWidthFromSnapshot', () => {
  it('defaults to wide when no route sets a width', () => {
    expect(contentWidthFromSnapshot(snapshot({}, snapshot()))).toBe('wide');
  });

  it('uses a parent Standard width for nested routes that omit it', () => {
    const tree = snapshot({}, snapshot({ contentWidth: 'standard' }, snapshot()));
    expect(contentWidthFromSnapshot(tree)).toBe('standard');
  });

  it('lets the deepest route win', () => {
    const tree = snapshot(
      {},
      snapshot({ contentWidth: 'standard' }, snapshot({ contentWidth: 'wide' })),
    );
    expect(contentWidthFromSnapshot(tree)).toBe('wide');
  });
});
