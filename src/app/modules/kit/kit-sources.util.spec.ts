import { readSources, sourceAddress } from './kit-sources.util';

describe('readSources', () => {
  it('reads web and app sources, and a kind-less one as the web page it was', () => {
    const page = { kind: 'app', title: 'Properties', section: null, route: '/properties' };
    const guide = { kind: 'docs', title: 'Guide', section: 'Steps', url: 'https://docs.leaseting.com/a#b' };
    const old = { title: 'Old', section: null, url: 'https://docs.leaseting.com/c' };
    expect(readSources([page, guide, old])).toEqual([page, guide, { kind: 'docs', ...old }]);
  });

  it('reads nothing when any entry is unsafe, so no marker points at the wrong source', () => {
    const page = { kind: 'app', title: 'Properties', section: null, route: '/properties' };
    for (const route of ['//evil.example', 'properties', '/a/../b', 'https://evil.example', '/Properties']) {
      expect(readSources([page, { ...page, route }])).toEqual([]);
    }
    expect(readSources([page, { kind: 'docs', title: 'x', section: null, url: 'javascript:alert(1)' }])).toEqual([]);
    expect(readSources('not a list')).toEqual([]);
    expect(readSources(undefined)).toEqual([]);
  });

  it('gives a source’s address: its route or its web address', () => {
    expect(sourceAddress({ kind: 'app', title: 'Bills', section: null, route: '/bills' })).toBe('/bills');
    expect(sourceAddress({ kind: 'docs', title: 'G', section: null, url: 'https://x.test' })).toBe('https://x.test');
  });
});
