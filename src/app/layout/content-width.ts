import { ActivatedRouteSnapshot } from '@angular/router';

export type ContentWidth = 'wide' | 'standard';

export function contentWidthFromSnapshot(root: ActivatedRouteSnapshot): ContentWidth {
  let width: ContentWidth = 'wide';
  let current: ActivatedRouteSnapshot | null = root;

  while (current) {
    const value = current.data['contentWidth'];
    if (value === 'wide' || value === 'standard') {
      width = value;
    }
    current = current.firstChild;
  }

  return width;
}
