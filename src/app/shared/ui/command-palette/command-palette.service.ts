import { Injectable, signal } from '@angular/core';

/** Opens/closes the global ⌘K command palette (rendered in MainLayout). */
@Injectable({ providedIn: 'root' })
export class CommandPaletteService {
  private readonly visible = signal(false);

  readonly isOpen = this.visible.asReadonly();

  show(): void {
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }

  toggle(): void {
    this.visible.update((open) => !open);
  }
}
