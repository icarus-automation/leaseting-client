import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PIcon } from '@primeicons/angular/p-icon';

interface KbArticle {
  /** Route slug under /knowledge-base, or null for a not-yet-written article. */
  slug: string | null;
  title: string;
  summary: string;
  category: string;
  icon: string;
  readMinutes: number | null;
}

// The knowledge base grows by adding entries here (and, for published ones, a
// route + component). Articles without a slug render as "coming soon" cards.
const ARTICLES: KbArticle[] = [
  {
    slug: 'utility-billing',
    title: 'Utility billing, explained simply',
    summary: 'Bill electricity and water to tenants: meter readings, rates, fees, and the monthly run.',
    category: 'Billing',
    icon: 'bolt',
    readMinutes: 5,
  },
  {
    slug: null,
    title: 'House rules & move-in guide',
    summary: 'What to hand every new tenant on day one. Sample entry, content coming soon.',
    category: 'Tenants',
    icon: 'home',
    readMinutes: null,
  },
];

@Component({
  selector: 'app-knowledge-base',
  imports: [RouterLink, PIcon],
  templateUrl: './knowledge-base.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnowledgeBase {
  private readonly all = ARTICLES;
  readonly query = signal('');

  readonly articles = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (!term) return this.all;
    return this.all.filter((article) =>
      `${article.title} ${article.summary} ${article.category}`.toLowerCase().includes(term),
    );
  });

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }
}
