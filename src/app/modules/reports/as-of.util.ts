import { endOfMonth, endOfQuarter, endOfYear, format, subMonths, subQuarters, subYears } from 'date-fns';

/**
 * "As of" dates for point-in-time reports.
 *
 * Aging is a snapshot, not a window, so these presets are single dates rather
 * than ranges. The three period-end options exist because that is when the
 * figures have to tie to something: a month-end aging run is the one a manager
 * defends in a meeting, and re-deriving it by hand from today's numbers is
 * impossible once payments have moved on.
 */

export type AsOfPreset = 'today' | 'last-month-end' | 'last-quarter-end' | 'last-year-end' | 'custom';

export const AS_OF_PRESETS: { value: AsOfPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'last-month-end', label: 'End of last month' },
  { value: 'last-quarter-end', label: 'End of last quarter' },
  { value: 'last-year-end', label: 'End of last year' },
  { value: 'custom', label: 'Pick a date' },
];

/**
 * What the "as of" control currently reads: which option is picked, and the
 * date it stands for.
 *
 * Both halves are kept because they answer different questions. The date is
 * what gets printed on the page, named in the CSV and carried in a shared
 * link. Which option is picked is what decides whether that date is sent to
 * the server at all, and only "Today" is treated as live.
 */
export interface AsOfSelection {
  preset: AsOfPreset;
  date: Date;
}

/** The date a preset resolves to, or null for `custom` (the picker drives it). */
export function resolveAsOf(preset: AsOfPreset, today = new Date()): Date | null {
  switch (preset) {
    case 'today':
      return today;
    case 'last-month-end':
      return endOfMonth(subMonths(today, 1));
    case 'last-quarter-end':
      return endOfQuarter(subQuarters(today, 1));
    case 'last-year-end':
      return endOfYear(subYears(today, 1));
    case 'custom':
      return null;
  }
}

/** The control's opening state: today, resolved on the reader's own clock. */
export function todaySelection(today = new Date()): AsOfSelection {
  return { preset: 'today', date: today };
}

/**
 * The `asOf` value to send with the request, or undefined to let the server
 * date the report itself.
 *
 * "Today" deliberately sends nothing. The browser and the server can sit on
 * different clocks, and a browser one day ahead would ask for a report dated
 * tomorrow, which the server refuses because a report headed with a date that
 * has not happened reads as fact and is not one. Every other option names a
 * date that has already passed, so sending it is safe and is the only way the
 * server can know which one was picked.
 */
export function asOfParam(selection: AsOfSelection): string | undefined {
  return selection.preset === 'today' ? undefined : toIsoDate(selection.date);
}

/**
 * yyyy-MM-dd in the viewer's own calendar day.
 *
 * date-fns `format` reads local time, which is what is wanted here: the date a
 * person picked in a date picker is the date they meant, not its UTC shadow.
 */
export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** "30 Nov 2026" from the ISO date the backend echoed back. */
export function asOfLabel(iso: string): string {
  return format(new Date(`${iso}T00:00:00`), 'd MMM yyyy');
}
