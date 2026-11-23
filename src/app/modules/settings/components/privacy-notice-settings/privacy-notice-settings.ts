import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PIcon } from '@primeicons/angular/p-icon';
import { MessageService } from 'primeng/api';
import { ProgressSpinner } from 'primeng/progressspinner';

import { AuthService } from '../../../../core/auth/auth.service';
import { apiErrorMessage } from '../../../../core/models/api.types';
import {
  PRIVACY_NOTICE_LIMITS,
  type PrivacyNotice,
  type PrivacyNoticeVersionDetail,
  type PrivacyNoticeVersionSummary,
} from '../../../../core/models/privacy.types';
import { ConfirmService } from '../../../../shared/ui/confirm/confirm.service';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { NoticeBody } from '../../../../shared/ui/notice-body/notice-body';
import { SegmentedControl, type SegmentedOption } from '../../../../shared/ui/segmented-control/segmented-control';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { copyToClipboard } from '../../../../shared/utils/clipboard.util';
import { PrivacyNoticeService } from '../../../../core/privacy/privacy-notice.service';

type EditorMode = 'edit' | 'preview';

type OpenVersion =
  | { version: number; kind: 'loading' }
  | { version: number; kind: 'ready'; detail: PrivacyNoticeVersionDetail }
  | { version: number; kind: 'error'; message: string };

/** The same text the API stores: Windows line endings and trailing spaces dropped. */
export function normalizeNoticeDraft(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/** Why the draft cannot be published as it stands, or null when it can. */
export function noticeDraftProblem(draft: string, notice: PrivacyNotice): string | null {
  const body = normalizeNoticeDraft(draft);
  if (body.length < PRIVACY_NOTICE_LIMITS.min) return 'Write the full notice. It is too short to publish.';
  if (body.length > PRIVACY_NOTICE_LIMITS.max) {
    return `Keep the notice under ${PRIVACY_NOTICE_LIMITS.max.toLocaleString('en-US')} characters.`;
  }
  // The starter can be adopted as it stands; any other version needs an edit.
  if (!notice.needsReview && body === notice.current.body) return 'Edit the notice before you publish a new version.';
  return null;
}

@Component({
  selector: 'app-privacy-notice-settings',
  imports: [
    DatePipe,
    DecimalPipe,
    PIcon,
    ProgressSpinner,
    ReactiveFormsModule,
    ErrorBanner,
    NoticeBody,
    SegmentedControl,
    Skeleton,
    StatusBadge,
  ],
  templateUrl: './privacy-notice-settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyNoticeSettings {
  private readonly api = inject(PrivacyNoticeService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly limits = PRIVACY_NOTICE_LIMITS;
  readonly modes: readonly SegmentedOption<EditorMode>[] = [
    { value: 'edit', label: 'Edit' },
    { value: 'preview', label: 'Preview' },
  ];

  readonly canEdit = computed(() => this.auth.can('organization:update'));
  readonly notice = signal<PrivacyNotice | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly mode = signal<EditorMode>('edit');
  readonly publishing = signal(false);
  readonly publishError = signal<string | null>(null);
  readonly openVersion = signal<OpenVersion | null>(null);

  /** Its limits are checked by `noticeDraftProblem`, which also knows about the current version. */
  readonly body = new FormControl('', { nonNullable: true });
  readonly draft = toSignal(this.body.valueChanges, { initialValue: '' });
  readonly draftLength = computed(() => normalizeNoticeDraft(this.draft()).length);

  readonly nextVersion = computed(() => (this.notice()?.current.version ?? 0) + 1);
  readonly draftProblem = computed(() => {
    const notice = this.notice();
    return notice ? noticeDraftProblem(this.draft(), notice) : null;
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.notice.set(null);
    this.api
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notice) => this.settle(notice),
        error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load the privacy notice.')),
      });
  }

  publisherName(version: PrivacyNoticeVersionSummary): string {
    if (!version.publishedBy) return 'Leaseting (starter)';
    return version.publishedBy.name || version.publishedBy.email || 'Someone';
  }

  async copyLink(url: string): Promise<void> {
    const copied = await copyToClipboard(url);
    this.toast.add(
      copied
        ? { severity: 'success', summary: 'Link copied' }
        : { severity: 'warn', summary: 'Could not copy', detail: 'Select the link and copy it yourself.' },
    );
  }

  toggleVersion(version: PrivacyNoticeVersionSummary): void {
    if (this.openVersion()?.version === version.version) {
      this.openVersion.set(null);
      return;
    }
    const current = this.notice()?.current;
    if (current && current.version === version.version) {
      this.openVersion.set({ version: version.version, kind: 'ready', detail: current });
      return;
    }
    this.openVersion.set({ version: version.version, kind: 'loading' });
    this.api
      .version(version.version)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          if (this.openVersion()?.version === detail.version) {
            this.openVersion.set({ version: detail.version, kind: 'ready', detail });
          }
        },
        error: (error: unknown) => {
          if (this.openVersion()?.version === version.version) {
            this.openVersion.set({
              version: version.version,
              kind: 'error',
              message: apiErrorMessage(error, 'Could not load this version.'),
            });
          }
        },
      });
  }

  confirmPublish(): void {
    const notice = this.notice();
    if (!notice || !this.canEdit() || this.publishing()) return;
    const problem = this.draftProblem();
    if (problem) {
      this.publishError.set(problem);
      return;
    }
    const version = this.nextVersion();
    this.confirm.proceed({
      header: `Publish version ${version}?`,
      message:
        'The public link shows it right away. Residence Care asks every tenant to agree to it the next time they open the app. Earlier versions stay on record.',
      acceptLabel: `Publish version ${version}`,
      onAccept: () => this.publish(),
    });
  }

  private publish(): void {
    this.publishError.set(null);
    this.publishing.set(true);
    this.api
      .publish(normalizeNoticeDraft(this.body.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notice) => {
          this.publishing.set(false);
          this.settle(notice);
          this.mode.set('edit');
          this.toast.add({ severity: 'success', summary: `Version ${notice.current.version} published` });
        },
        error: (error: unknown) => {
          this.publishing.set(false);
          this.publishError.set(apiErrorMessage(error, 'Could not publish the notice.'));
        },
      });
  }

  private settle(notice: PrivacyNotice): void {
    this.notice.set(notice);
    this.openVersion.set(null);
    this.publishError.set(null);
    this.body.setValue(notice.current.body);
  }
}
