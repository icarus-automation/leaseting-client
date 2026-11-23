import { ActivatedRouteSnapshot, Data, Route } from '@angular/router';

import { routes } from '../../app.routes';
import { contentWidthFromSnapshot } from '../../layout/content-width';
import { SETTINGS_ROUTES } from './settings.routes';

const COLUMN_PAGES = [
  'organization',
  'privacy-notice',
  'property-types',
  'charge-items',
  'late-fees',
  'payment-destinations',
  'vehicle-types',
  'rate-plans',
  'parking-pass-prices',
  'parking-rules',
  'parking-terminals',
];

// The index fills the full container. Table-heavy pages may opt into it; every other page shares one column.
const INDEX_PAGE = '';
const TABLE_PAGES = ['users', 'roles', 'roles/new', 'roles/:roleId'];
const MAY_SET_WIDTH = [INDEX_PAGE, ...TABLE_PAGES];

const pages = SETTINGS_ROUTES.filter((route) => route.redirectTo === undefined);
const shell = routes.find((route) => route.children?.some((child) => child.path === 'settings'));
const settings = shell?.children?.find((child) => child.path === 'settings');

function snapshot(data: Data | undefined, firstChild: ActivatedRouteSnapshot | null): ActivatedRouteSnapshot {
  return { data: data ?? {}, firstChild } as ActivatedRouteSnapshot;
}

function widthOf(page: Route) {
  const tree = snapshot({}, snapshot(shell?.data, snapshot(settings?.data, snapshot(page.data, null))));
  return contentWidthFromSnapshot(tree);
}

describe('settings content width', () => {
  it('lets the index fill the full content container', () => {
    expect(widthOf(pages.find((page) => page.path === INDEX_PAGE)!)).toBe('wide');
  });

  it('keeps every form page in the shared Standard column', () => {
    const widths = COLUMN_PAGES.map((path) => [path, widthOf(pages.find((page) => page.path === path)!)]);
    expect(widths).toEqual(COLUMN_PAGES.map((path) => [path, 'standard']));
  });

  it('sets the width once on the parent route, never per form page', () => {
    expect(settings?.data?.['contentWidth']).toBe('standard');
    const ownWidth = pages
      .filter((page) => page.data?.['contentWidth'] !== undefined && !MAY_SET_WIDTH.includes(page.path ?? ''))
      .map((page) => page.path);
    expect(ownWidth).toEqual([]);
  });

  it('classifies every settings page as the index, a column page, or a table page', () => {
    const unclassified = pages
      .map((page) => page.path ?? '')
      .filter((path) => !COLUMN_PAGES.includes(path) && !MAY_SET_WIDTH.includes(path));
    expect(unclassified).toEqual([]);
  });
});
