import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PublicPrivacyNotice } from '../../core/models/privacy.types';
import { ErrorBanner } from '../../shared/ui/error-banner/error-banner';
import { NoticeBody } from '../../shared/ui/notice-body/notice-body';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { PublicPrivacyNoticeService } from './services/public-privacy-notice.service';

type PageState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; notice: PublicPrivacyNotice };

/** An organization's current privacy notice, for anyone with the link. */
@Component({
  selector: 'app-public-privacy-notice',
  imports: [DatePipe, ErrorBanner, NoticeBody, Skeleton],
  host: { class: 'block min-h-dvh bg-surface' },
  template: `
    <main class="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      @switch (state().kind) {
        @case ('loading') {
          <app-skeleton variant="panel" />
        }
        @case ('missing') {
          <div class="flex flex-col gap-2 rounded-base border border-border bg-background px-5 py-8 text-center" role="alert">
            <h1 class="m-0 font-heading text-xl font-semibold text-heading">Privacy notice not found</h1>
            <p class="m-0 text-[13.5px] text-muted">Check the link with your property manager.</p>
          </div>
        }
        @case ('error') {
          <app-error-banner [message]="errorMessage()" [retryable]="true" (retry)="load(slug())" />
        }
        @case ('ready') {
          @if (notice(); as current) {
            <header class="flex flex-col gap-1.5">
              <p class="m-0 text-[12.5px] font-semibold uppercase tracking-[0.055em] text-muted">
                {{ current.organization.name }}
              </p>
              <h1 class="m-0 font-heading text-2xl font-semibold text-heading sm:text-[28px]">Privacy notice</h1>
              <p class="m-0 text-[13px] text-muted">
                Version {{ current.version }} · Effective {{ current.publishedAt | date: 'MMMM d, y' }}
              </p>
            </header>
            <article class="rounded-base border border-border bg-background px-5 py-6 sm:px-7">
              <app-notice-body [body]="current.body" />
            </article>
            <p class="m-0 text-[12px] leading-relaxed text-muted">
              This page always shows the current version of {{ current.organization.name }}'s notice. Kept with Leaseting.
            </p>
          }
        }
      }
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicPrivacyNoticePage {
  private readonly api = inject(PublicPrivacyNoticeService);
  private readonly title = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly slug = computed(() => this.params().get('slug') ?? '');

  readonly state = signal<PageState>({ kind: 'loading' });
  readonly notice = computed(() => {
    const current = this.state();
    return current.kind === 'ready' ? current.notice : null;
  });
  readonly errorMessage = computed(() => {
    const current = this.state();
    return current.kind === 'error' ? current.message : '';
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => this.load(slug));
    });
  }

  load(slug: string): void {
    this.state.set({ kind: 'loading' });
    this.api
      .get(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notice) => {
          this.state.set({ kind: 'ready', notice });
          this.title.setTitle(`Privacy notice · ${notice.organization.name}`);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.state.set({ kind: 'missing' });
            return;
          }
          this.state.set({ kind: 'error', message: apiErrorMessage(error, 'Could not load this privacy notice.') });
        },
      });
  }
}
