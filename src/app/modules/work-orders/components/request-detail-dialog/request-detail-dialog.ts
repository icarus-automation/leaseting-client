import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import type { Subscription } from 'rxjs';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { StaffMaintenanceRequest } from '../../../../core/models/maintenance-request.types';
import { createFormErrors } from '../../../../shared/forms/form-errors';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { FormDialog } from '../../../../shared/ui/form-dialog/form-dialog';
import { StatusBadge } from '../../../../shared/ui/status-badge/status-badge';
import { MaintenanceRequestsService } from '../../services/maintenance-requests.service';
import {
  nextRequestAction,
  requestStatusBadge,
  requestTenantName,
  requestUnitLabel,
  RESOLVE_NOTE_MAX,
} from '../../utils/maintenance-request.util';
import { RequestPhotos } from '../request-photos/request-photos';

@Component({
  selector: 'app-request-detail-dialog',
  imports: [DatePipe, ReactiveFormsModule, ErrorBanner, FormDialog, StatusBadge, RequestPhotos],
  templateUrl: './request-detail-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestDetailDialog {
  private readonly requests = inject(MaintenanceRequestsService);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly visible = model.required<boolean>();
  readonly request = input<StaffMaintenanceRequest | null>(null);
  readonly changed = output<void>();

  readonly current = linkedSignal(() => this.request());
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);
  readonly noteMax = RESOLVE_NOTE_MAX;
  readonly noteTooLong = `Keep the note to ${RESOLVE_NOTE_MAX} characters.`;
  readonly resolveForm = this.fb.nonNullable.group({
    resolveNote: ['', Validators.maxLength(RESOLVE_NOTE_MAX)],
  });
  readonly resolveFormErrors = createFormErrors(this.resolveForm);
  private readonly resolveNote = toSignal(this.resolveForm.controls.resolveNote.valueChanges, {
    initialValue: '',
  });
  readonly remainingNoteCharacters = computed(() =>
    Math.max(0, RESOLVE_NOTE_MAX - this.resolveNote().length),
  );

  readonly badge = computed(() => {
    const request = this.current();
    return request ? requestStatusBadge(request.status) : null;
  });
  readonly action = computed(() => {
    const request = this.current();
    return request ? nextRequestAction(request.status) : null;
  });
  readonly tenantName = computed(() => {
    const request = this.current();
    return request ? requestTenantName(request) : '';
  });
  readonly unitLabel = computed(() => {
    const request = this.current();
    return request ? requestUnitLabel(request) : null;
  });

  private refreshSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      if (!this.visible()) return;
      const id = this.request()?.id;
      if (!id) return;
      untracked(() => {
        this.error.set(null);
        this.resolveForm.reset({ resolveNote: '' });
        this.resolveFormErrors.reset();
        this.refresh(id);
      });
    });
  }

  start(): void {
    const request = this.current();
    if (!request || this.action() !== 'start' || this.busy()) return;
    this.cancelRefresh();
    this.busy.set(true);
    this.error.set(null);
    this.requests
      .start(request.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (started) => {
          this.busy.set(false);
          this.current.set(started);
          this.toast.add({
            severity: 'success',
            summary: 'Request started',
            detail: `${started.title}, unit ${started.unit.unitNo}, is in progress.`,
          });
          this.changed.emit();
          this.visible.set(false);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(error, 'Could not start this request.'));
          if (isConflict(error)) this.refresh(request.id);
        },
      });
  }

  resolve(): void {
    const request = this.current();
    if (!request || this.action() !== 'resolve' || this.busy()) return;
    this.resolveFormErrors.submitted.set(true);
    if (this.resolveForm.invalid) {
      this.resolveForm.markAllAsTouched();
      return;
    }
    this.cancelRefresh();
    this.busy.set(true);
    this.error.set(null);
    const note = this.resolveForm.controls.resolveNote.value.trim();
    this.requests
      .resolve(request.id, note)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resolved) => {
          this.busy.set(false);
          this.current.set(resolved);
          this.toast.add({
            severity: 'success',
            summary: 'Request resolved',
            detail: `${resolved.title}, unit ${resolved.unit.unitNo}, is resolved.`,
          });
          this.changed.emit();
          this.visible.set(false);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.error.set(apiErrorMessage(error, 'Could not resolve this request.'));
          if (isConflict(error)) this.refresh(request.id);
        },
      });
  }

  private refresh(id: string): void {
    this.cancelRefresh();
    this.refreshSubscription = this.requests
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fresh) => {
          const shown = this.current();
          if (shown?.id !== id) return;
          this.current.set(fresh);
          if (shown.status !== fresh.status) this.changed.emit();
        },
        error: () => undefined,
      });
  }

  private cancelRefresh(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = null;
  }
}

function isConflict(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 409;
}
