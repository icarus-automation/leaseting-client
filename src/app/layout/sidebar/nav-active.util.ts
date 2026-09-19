export function navLinkIsActive(url: string, route: string): boolean {
  const path = url.split(/[?#]/)[0];
  if (route === '/bills') {
    return path === '/bills' || (path.startsWith('/bills/') && !path.startsWith('/bills/submissions'));
  }
  return path === route || path.startsWith(`${route}/`);
}
