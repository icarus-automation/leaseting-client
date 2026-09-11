import { describe, expect, it, vi } from 'vitest';

import type { MenuItem } from 'primeng/api';
import type { Menu } from 'primeng/menu';

import { showPopupMenu } from './popup-menu.util';

function menuStub(overrides: Partial<Menu> = {}): Menu {
  return {
    model: undefined,
    visible: false,
    overlayVisible: false,
    hide: vi.fn(),
    show: vi.fn(),
    toggle: vi.fn(),
    ...overrides,
  } as unknown as Menu;
}

describe('showPopupMenu', () => {
  const items: MenuItem[] = [{ label: 'End lease' }];

  it('shows the menu when nothing is open', () => {
    const menu = menuStub();
    const event = new Event('click');
    const stop = vi.spyOn(event, 'stopPropagation');

    showPopupMenu(menu, event, items);

    expect(stop).toHaveBeenCalled();
    expect(menu.model).toEqual(items);
    expect(menu.show).toHaveBeenCalledWith(event);
    expect(menu.hide).not.toHaveBeenCalled();
  });

  it('retargets an already open menu instead of toggling it closed', async () => {
    const menu = menuStub({ visible: true, overlayVisible: true });
    const event = new Event('click');

    showPopupMenu(menu, event, items);

    expect(menu.hide).toHaveBeenCalled();
    expect(menu.show).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(menu.show).toHaveBeenCalledWith(event);
  });
});
