import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePicker } from 'primeng/datepicker';
import { Drawer } from 'primeng/drawer';
import { Select } from 'primeng/select';
import { format } from 'date-fns';

import { apiErrorMessage } from '../../core/models/api.types';
import type { PageMeta } from '../../core/models/api.types';
import type { AuditAction, AuditArea, AuditEvent } from '../../core/models/audit-event.types';
import type { Member } from '../../core/models/member.types';
import type { PropertyListItem } from '../../core/models/property.types';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { ErrorBanner } from '../../shared/ui/error-banner/error-banner';
import { Pagination } from '../../shared/ui/pagination/pagination';
import { Skeleton } from '../../shared/ui/skeleton/skeleton';
import { PropertiesService } from '../properties/services/properties.service';
import { MembersService } from '../settings/services/members.service';
import { AuditEventsService } from './audit-events.service';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_AREAS,
  AUDIT_AREA_ACTIONS,
  AUDIT_AREA_LABELS,
  auditActionLabel,
  auditFieldChanges,
  describeAuditEvent,
  type AuditFieldChange,
} from './audit-event.util';

const PAGE_SIZE = 20;
const MANILA = 'Asia/Manila';

interface SelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-audit-log',
  imports: [DatePipe, FormsModule, DatePicker, Drawer, Select, EmptyState, ErrorBanner, Pagination, Skeleton],
  templateUrl: './audit-log.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLog {
  private readonly audit = inject(AuditEventsService);
  private readonly members = inject(MembersService);
  private readonly propertiesApi = inject(PropertiesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly manila = MANILA;
  readonly skeletons = Array.from({ length: 6 });
  readonly areaOptions: SelectOption[] = AUDIT_AREAS.map((area) => ({
    label: AUDIT_AREA_LABELS[area],
    value: area,
  }));

  readonly area = signal<AuditArea | null>(null);
  readonly actorId = signal<string | null>(null);
  readonly action = signal<AuditAction | null>(null);
  readonly propertyId = signal<string | null>(null);
  readonly query = signal('');
  readonly from = signal<Date | null>(null);
  readonly to = signal<Date | null>(null);

  readonly events = signal<AuditEvent[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly detail = signal<AuditEvent | null>(null);

  readonly people = signal<Member[] | null>(null);
  readonly peopleError = signal(false);
  readonly properties = signal<PropertyListItem[]>([]);

  readonly actorOptions = computed<SelectOption[]>(() =>
    (this.people() ?? []).map((person) => ({
      label: person.status === 'ACTIVE' ? person.name : `${person.name} (deactivated)`,
      value: person.userId,
    })),
  );

  readonly propertyOptions = computed<SelectOption[]>(() =>
    this.properties().map((property) => ({ label: property.name, value: property.id })),
  );

  readonly actionOptions = computed(() => {
    const area = this.area();
    const areas = area ? AUDIT_AREAS.filter((id) => id === area) : AUDIT_AREAS;
    return areas.map((id) => ({
      label: AUDIT_AREA_LABELS[id],
      items: AUDIT_AREA_ACTIONS[id].map((action) => ({ label: AUDIT_ACTION_LABELS[action], value: action })),
    }));
  });

  readonly isFiltered = computed(
    () =>
      this.area() !== null ||
      this.actorId() !== null ||
      this.action() !== null ||
      this.propertyId() !== null ||
      this.query().trim().length > 0 ||
      this.from() !== null ||
      this.to() !== null,
  );

  constructor() {
    this.load(1);
    this.loadPeople();
    this.loadProperties();
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    const from = this.from();
    const to = this.to();
    const q = this.query().trim();
    this.audit
      .list({
        area: this.area() ?? undefined,
        actorId: this.actorId() ?? undefined,
        action: this.action() ?? undefined,
        propertyId: this.propertyId() ?? undefined,
        q: q.length > 0 ? q : undefined,
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

  loadProperties(): void {
    this.propertiesApi
      .list(1, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.properties.set(page.data),
        error: () => this.properties.set([]),
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

  setArea(area: AuditArea | null): void {
    this.area.set(area ?? null);
    const action = this.action();
    if (area && action && !AUDIT_AREA_ACTIONS[area].includes(action)) this.action.set(null);
    this.load(1);
  }

  setActor(actorId: string | null): void {
    this.actorId.set(actorId ?? null);
    this.load(1);
  }

  setAction(action: AuditAction | null): void {
    this.action.set(action ?? null);
    this.load(1);
  }

  setProperty(propertyId: string | null): void {
    this.propertyId.set(propertyId ?? null);
    this.load(1);
  }

  setQuery(value: string): void {
    this.query.set(value ?? '');
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
    this.area.set(null);
    this.actorId.set(null);
    this.action.set(null);
    this.propertyId.set(null);
    this.query.set('');
    this.from.set(null);
    this.to.set(null);
    this.load(1);
  }

  open(event: AuditEvent): void {
    this.detail.set(event);
  }

  onDrawerVisible(visible: boolean): void {
    if (!visible) this.detail.set(null);
  }

  drawerTitle(): string {
    const event = this.detail();
    return event ? auditActionLabel(event.action) : 'Change';
  }

  actionLabel(event: AuditEvent): string {
    return auditActionLabel(event.action);
  }

  areaLabel(event: AuditEvent): string {
    return AUDIT_AREA_LABELS[event.area];
  }

  describe(event: AuditEvent): string {
    return describeAuditEvent(event);
  }

  changes(event: AuditEvent): AuditFieldChange[] {
    return auditFieldChanges(event.before, event.after);
  }
}
