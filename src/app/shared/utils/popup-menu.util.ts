import type { MenuItem } from 'primeng/api';
import type { Menu } from 'primeng/menu';

/**
 * Opens a PrimeNG popup menu aligned to the triggering control.
 *
 * If another row's menu is already open, hide-then-show retargets it;
 * `toggle` would just close the current overlay.
 */
export function showPopupMenu(menu: Menu, event: Event, items: MenuItem[]): void {
  event.stopPropagation();
  menu.model = items;
  if (menu.visible || menu.overlayVisible) {
    menu.hide();
    queueMicrotask(() => menu.show(event));
  } else {
    menu.show(event);
  }
}
