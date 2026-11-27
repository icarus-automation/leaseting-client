/** Pages under /bills with a sidebar link of their own, so Bills stays unlit there. */
const OWN_BILLS_PAGES = ['/bills/soa', '/bills/submissions'];

function isUnder(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}/`);
}

export function navLinkIsActive(url: string, route: string): boolean {
  const path = url.split(/[?#]/)[0];
  if (route === '/bills') {
    return isUnder(path, '/bills') && !OWN_BILLS_PAGES.some((page) => isUnder(path, page));
  }
  return isUnder(path, route);
}
