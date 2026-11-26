import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';
import { Popover } from 'primeng/popover';

import { AuthService } from '../../../../core/auth/auth.service';
import { canOpenNavPage, findNavPage } from '../../../../layout/sidebar/nav-sections';
import type { KitDocsSource, KitSource } from '../../kit-chat.types';

/**
 * The sources one sentence of a Kit reply rests on. A page of this app is a
 * chip of its own, with the page's sidebar icon and label, and opens in place.
 * Web sources share one chip showing the first title and "+N"; clicking it
 * opens a popover that pages through them, each opening in a new tab.
 */
@Component({
  selector: 'app-kit-source-chip',
  imports: [PIcon, Popover, RouterLink],
  templateUrl: './kit-source-chip.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KitSourceChip {
  private readonly auth = inject(AuthService);

  readonly sources = input.required<KitSource[]>();

  private readonly panel = viewChild<Popover>('panel');

  readonly index = signal(0);
  readonly open = signal(false);

  /**
   * The app page this chip opens. Only a page the sidebar has, and only when
   * this session may open it now: a link saved for someone with more access,
   * or a route this build does not know, draws nothing.
   */
  readonly page = computed(() => {
    const [source] = this.sources();
    if (this.sources().length !== 1 || source?.kind !== 'app') return null;
    const nav = findNavPage(source.route);
    if (!nav || !canOpenNavPage(source.route, (code) => this.auth.can(code))) return null;
    return { route: source.route, title: source.title, icon: nav.icon };
  });

  readonly docs = computed(() => this.sources().filter((source): source is KitDocsSource => source.kind === 'docs'));
  readonly more = computed(() => this.docs().length - 1);
  readonly current = computed(() => this.docs()[Math.min(this.index(), this.docs().length - 1)]);
  readonly chipLabel = computed(() => {
    const [first] = this.docs();
    const more = this.more();
    return more > 0 ? `Sources: ${first.title} and ${more} more` : `Source: ${first.title}`;
  });

  toggle(event: Event): void {
    if (!this.open()) this.index.set(0);
    this.panel()?.toggle(event);
  }

  previous(): void {
    this.index.update((index) => Math.max(0, index - 1));
  }

  next(): void {
    this.index.update((index) => Math.min(this.docs().length - 1, index + 1));
  }
}
