import { ActivatedRouteSnapshot } from '@angular/router';

/**
 * How the main column sizes page content.
 *
 * Wide (default) — fluid; lists, tables, dashboards, calendar.
 * Standard — shared max width, left-aligned with the same gutter; settings,
 * forms, knowledge articles.
 */
export type ContentWidth = 'wide' | 'standard';

/**
 * Walk the active route tree. The deepest `data.contentWidth` wins, so a
 * Standard section can still opt a child back to Wide.
 */
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
