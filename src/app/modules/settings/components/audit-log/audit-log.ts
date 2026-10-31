import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { format } from 'date-fns';

import { apiErrorMessage } from '../../../../core/models/api.types';
import type { PageMeta } from '../../../../core/models/api.types';
import type { AuditAction, AuditEvent } from '../../../../core/models/audit-event.types';
import type { Member } from '../../../../core/models/member.types';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../../../shared/ui/error-banner/error-banner';
import { Pagination } from '../../../../shared/ui/pagination/pagination';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { AuditEventsService } from '../../services/audit-events.service';
import { MembersService } from '../../services/members.service';
import {
  AUDIT_ACTION_GROUPS,
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  describeAuditEvent,
} from '../../utils/audit-event.util';

const PAGE_SIZE = 20;

interface ActorOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-audit-log',
  imports: [DatePipe, FormsModule, DatePicker, Select, EmptyState, ErrorBanner, Pagination, Skeleton],
  templateUrl: './audit-log.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLog {
  private readonly audit = inject(AuditEventsService);
  private readonly members = inject(MembersService);
  private readonly destroyRef = inject(DestroyRef);

  readonly skeletons = Array.from({ length: 6 });
  readonly actionOptions = AUDIT_ACTION_GROUPS.map((group) => ({
    label: group.label,
    items: group.actions.map((action) => ({ label: AUDIT_ACTION_LABELS[action], value: action })),
  }));

  readonly actorId = signal<string | null>(null);
  readonly action = signal<AuditAction | null>(null);
  readonly from = signal<Date | null>(null);
  readonly to = signal<Date | null>(null);

  readonly events = signal<AuditEvent[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly people = signal<Member[] | null>(null);
  readonly peopleError = signal(false);
  readonly actorOptions = computed<ActorOption[]>(() =>
    (this.people() ?? []).map((person) => ({
      label: person.status === 'ACTIVE' ? person.name : `${person.name} (deactivated)`,
      value: person.userId,
    })),
  );

  readonly isFiltered = computed(
    () => this.actorId() !== null || this.action() !== null || this.from() !== null || this.to() !== null,
  );

  constructor() {
    this.load(1);
    this.loadPeople();
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    const from = this.from();
    const to = this.to();
    this.audit
      .list({
        actorId: this.actorId() ?? undefined,
        action: this.action() ?? undefined,
        from: from ? format(from, 'yyyy-MM-dd') : undefined,
        to: to ? format(to, 'yyyy-MM-dd') : undefined,
        page,
        limit: PAGE_SIZE,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.events.set(result.data);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(error, 'Could not load the audit log.'));
        },
      });
  }

  loadPeople(): void {
    this.peopleError.set(false);
    this.members
      .listAllStaff()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (people) => this.people.set(people),
        error: () => {
          this.people.set([]);
          this.peopleError.set(true);
        },
      });
  }

  setActor(actorId: string | null): void {
    this.actorId.set(actorId ?? null);
    this.load(1);
  }

  setAction(action: AuditAction | null): void {
    this.action.set(action ?? null);
    this.load(1);
  }

  setFrom(date: Date | null): void {
    this.from.set(date ?? null);
    this.load(1);
  }

  setTo(date: Date | null): void {
    this.to.set(date ?? null);
    this.load(1);
  }

  clearFilters(): void {
    this.actorId.set(null);
    this.action.set(null);
    this.from.set(null);
    this.to.set(null);
    this.load(1);
  }

  actionLabel(event: AuditEvent): string {
    return auditActionLabel(event.action);
  }

  describe(event: AuditEvent): string {
    return describeAuditEvent(event);
  }
}
