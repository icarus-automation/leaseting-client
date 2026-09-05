import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector,
  afterNextRender, computed, inject, signal, viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, filter, fromEvent, map, merge, of, switchMap, timer } from 'rxjs';
import { PIcon } from '@primeicons/angular/p-icon';
import { SelectModule } from 'primeng/select';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import type { CalendarOptions, DatesSetArg, EventApi, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';

import { apiErrorMessage } from '../../core/models/api.types';
import { CalendarEntry, CalendarEventType, CalendarProperty } from '../../core/models/calendar.types';
import { PhpCurrencyPipe } from '../../shared/pipes/php-currency-pipe';
import { StatusBadge } from '../../shared/ui/status-badge/status-badge';
import { CalendarService } from './calendar.service';
import {
  ALL_EVENT_TYPES, CalendarState, CalendarView, EVENT_TYPES, calendarQueryParams,
  entrySource, entryTone, manilaToday, matchesCalendarFilters, nextManilaMidnight, readCalendarState,
} from './calendar-state';

const VIEWS: Record<CalendarView, string> = { month: 'dayGridMonth', week: 'dayGridWeek', agenda: 'listMonth' };

@Component({
  selector: 'app-calendar',
  imports: [DatePipe, FormsModule, RouterLink, PIcon, SelectModule, FullCalendarModule, PhpCurrencyPipe, StatusBadge],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsCalendar {
  private readonly service = inject(CalendarService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly calendar = viewChild(FullCalendarComponent);
  private readonly details = viewChild<ElementRef<HTMLElement>>('details');
  private returnFocus: HTMLElement | null = null;
  private readonly compact = window.matchMedia('(max-width: 767px)').matches;
  private readonly range = signal<{ start: string; end: string } | null>(null);
  private readonly revision = signal(0);

  readonly state = signal(readCalendarState(this.route.snapshot.queryParamMap, this.compact));
  readonly searchText = signal(this.state().q);
  readonly entries = signal<CalendarEntry[]>([]);
  readonly properties = signal<CalendarProperty[]>([]);
  readonly propertiesError = signal(false);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly today = signal(manilaToday());
  readonly title = signal('');
  // FullCalendar only reads `now` when it (re)builds its internal date environment, so an in-place
  // setOption cannot move the today highlight; remounting is the supported way to refresh it.
  readonly calendarKey = signal(0);
  readonly selected = signal<CalendarEntry | null>(null);
  readonly eventTypes = EVENT_TYPES;
  readonly viewOptions: { value: CalendarView; label: string; icon: string }[] = [
    { value: 'month', label: 'Month', icon: 'calendar' },
    { value: 'week', label: 'Week', icon: 'table' },
    { value: 'agenda', label: 'Agenda', icon: 'list' },
  ];
  readonly scopeOptions = [
    { value: 'all', label: 'All entries' },
    { value: 'outstanding', label: 'Outstanding bills' },
  ];
  readonly tone = entryTone;
  readonly source = entrySource;
  readonly propertyOptions = computed(() => {
    const options = this.properties().map((property) => ({
      value: property.id, label: `${property.name}${property.isArchived ? ' (archived)' : ''}`,
    }));
    if (this.state().propertyId && !options.some((option) => option.value === this.state().propertyId)) {
      options.unshift({ value: this.state().propertyId, label: 'Selected property' });
    }
    return [{ value: '', label: 'All properties' }, ...options];
  });
  readonly filtered = computed(() => this.entries().filter((entry) => matchesCalendarFilters(entry, this.state())));
  readonly typeCounts = computed(() => {
    const entries = this.entries().filter((entry) => matchesCalendarFilters(entry, this.state(), false));
    return Object.fromEntries(EVENT_TYPES.map((type) => [type.value, entries.filter((entry) => entry.type === type.value).length]));
  });
  readonly overdueCount = computed(() => this.filtered().filter((entry) => entry.status === 'OVERDUE').length);
  readonly hasFilters = computed(() => !!this.state().propertyId || !!this.state().q
    || this.state().types.length !== ALL_EVENT_TYPES.length || this.state().scope !== 'all');
  readonly calendarEvents = computed<EventInput[]>(() => this.filtered().map((entry) => ({
    id: entry.id, title: `${entry.title} · ${entry.unit.unitNo}`, start: entry.date, allDay: true,
    extendedProps: { entry, priority: entry.status === 'OVERDUE' ? 0 : entry.status === 'TODAY' ? 1 : 2 },
  })));

  readonly options: CalendarOptions = {
    plugins: [dayGridPlugin, listPlugin],
    initialView: VIEWS[this.state().view], initialDate: this.state().date,
    headerToolbar: false, height: 'auto', firstDay: 1,
    editable: false, selectable: false, eventStartEditable: false, eventDurationEditable: false,
    eventInteractive: true, displayEventTime: false, eventDisplay: 'block',
    fixedWeekCount: false, showNonCurrentDates: false, dayMaxEvents: 2,
    views: { dayGridWeek: { dayMaxEvents: false } },
    eventOrder: 'priority,title,id', eventOrderStrict: true,
    dayHeaderFormat: { weekday: 'short' },
    moreLinkText: (count) => `+${count} more`,
    noEventsText: 'No entries in this range.',
    // All entries are date-only. This pins the today highlight to the operational clock.
    now: () => `${this.today()}T12:00:00`,
    datesSet: (info) => this.onDatesSet(info),
    eventClick: (info) => this.openEntry(this.eventEntry(info.event), info.el),
    eventDidMount: (info) => {
      const entry = this.eventEntry(info.event);
      const label = `${entry.title}, ${entry.date}, Unit ${entry.unit.unitNo}, ${entry.property.name}, ${entry.tenant?.name ?? 'Tenant not selected'}, ${entry.statusLabel}`;
      info.el.setAttribute('aria-label', label);
      info.el.title = label;
    },
  };

  constructor() {
    this.loadProperties();
    merge(fromEvent(window, 'focus'), timer(nextManilaMidnight(), 86_400_000))
      .pipe(takeUntilDestroyed()).subscribe(() => this.updateDayIfChanged());
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const state = readCalendarState(params, this.compact);
      if (JSON.stringify(state) === JSON.stringify(this.state())) return;
      this.state.set(state);
      this.searchText.set(state.q);
      this.selected.set(null);
      const api = this.calendar()?.getApi();
      if (api) api.batchRendering(() => {
        if (api.view.type !== VIEWS[state.view]) api.changeView(VIEWS[state.view], state.date);
        else if (state.date < this.localDate(api.view.currentStart) || state.date >= this.localDate(api.view.currentEnd)) api.gotoDate(state.date);
      });
    });

    toObservable(this.searchText).pipe(
      debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(),
    ).subscribe((q) => { if (q.trim() !== this.state().q) this.setState({ q: q.trim().slice(0, 120) }); });

    const request = computed(() => ({ range: this.range(), propertyId: this.state().propertyId, revision: this.revision() }));
    toObservable(request).pipe(
      filter((value) => value.range !== null),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap(({ range, propertyId }) => {
        this.loading.set(true);
        this.error.set(null);
        this.entries.set([]);
        this.selected.set(null);
        return this.service.events(range!.start, range!.end, propertyId).pipe(
          map((feed) => ({ feed, error: null })),
          catchError((error: unknown) => of({ feed: null, error: apiErrorMessage(error, 'Could not load the calendar. Try again.') })),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(({ feed, error }) => {
      this.loading.set(false);
      this.error.set(error);
      if (feed) {
        this.entries.set(feed.events);
        this.today.set(feed.today);
        afterNextRender(() => this.calendar()?.getApi()?.updateSize(), { injector: this.injector });
      }
    });
  }

  loadProperties(): void {
    this.propertiesError.set(false);
    this.service.properties().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (properties) => this.properties.set(properties),
      error: () => this.propertiesError.set(true),
    });
  }

  setState(patch: Partial<CalendarState>): void {
    const next = { ...this.state(), ...patch };
    this.state.set(next);
    this.selected.set(null);
    void this.router.navigate([], {
      relativeTo: this.route, queryParams: calendarQueryParams(next), replaceUrl: true,
    });
  }

  toggleType(type: CalendarEventType): void {
    const selected = this.state().types;
    const types = selected.includes(type) ? selected.filter((value) => value !== type) : [...selected, type];
    this.setState({ types: ALL_EVENT_TYPES.filter((value) => types.includes(value)) });
  }

  resetFilters(): void {
    this.searchText.set('');
    this.setState({ propertyId: '', q: '', types: [...ALL_EVENT_TYPES], scope: 'all' });
  }

  changeView(view: CalendarView): void {
    this.setState({ view });
    this.calendar()?.getApi().changeView(VIEWS[view], this.state().date);
  }

  navigate(direction: 'prev' | 'next' | 'today'): void {
    const api = this.calendar()?.getApi();
    if (direction === 'today') {
      this.updateDayIfChanged();
      api?.gotoDate(this.today());
    }
    else api?.[direction]();
  }

  retryEntries(): void {
    if (this.error()) this.revision.update((value) => value + 1);
  }

  eventEntry(event: EventApi): CalendarEntry { return event.extendedProps['entry'] as CalendarEntry; }
  entryIcon(type: CalendarEventType): string { return EVENT_TYPES.find((item) => item.value === type)!.icon; }

  openEntry(entry: CalendarEntry, trigger: HTMLElement): void {
    this.returnFocus = trigger;
    this.selected.set(entry);
    afterNextRender(() => {
      this.details()?.nativeElement.focus({ preventScroll: true });
      this.details()?.nativeElement.scrollIntoView({ block: 'nearest' });
    }, { injector: this.injector });
  }

  closeEntry(): void {
    this.selected.set(null);
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }

  private updateDayIfChanged(): void {
    const day = manilaToday();
    if (day === this.today()) return;
    this.today.set(day);
    this.revision.update((value) => value + 1);
    this.options.initialDate = this.state().date;
    this.options.initialView = VIEWS[this.state().view];
    this.calendarKey.update((value) => value + 1);
  }

  private onDatesSet(info: DatesSetArg): void {
    const start = this.localDate(info.view.currentStart);
    const end = this.localDate(info.view.currentEnd);
    this.title.set(info.view.title);
    if (this.range()?.start !== start || this.range()?.end !== end) this.range.set({ start, end });
    const view = (Object.keys(VIEWS) as CalendarView[]).find((key) => VIEWS[key] === info.view.type)!;
    // Keep the URL anchored within the displayed range without altering a deliberate day selection.
    if (this.state().view !== view || this.state().date < start || this.state().date >= end) {
      this.setState({ date: start, view });
    }
  }

  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
