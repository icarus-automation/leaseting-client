# Calendar

`/calendar` collects dates already held by leases, issued bills and tenant onboarding. Staff can open it from the Today sidebar group, between Dashboard and Ask Kit, or from the command palette. It is a Snipe-IT-inspired operational calendar within Leaseting's existing visual system: the calendar has no event editor, drag-and-drop, date selection, recurrence generator or separate event table. Changes belong to the source record and appear on the next feed request.

## Sources and dates

| Entry type | Source | Meaning |
| --- | --- | --- |
| Bills due (`BILL_DUE`) | Issued bill due date | Includes paid bills and bills for ended leases. Unissued future rent is not forecast. |
| Lease ends (`LEASE_END`) | Lease end date, or an earlier termination day | Early termination replaces the scheduled end milestone. |
| Lease starts (`LEASE_START`) | Lease start date | A start cancelled by termination before it began is omitted. |
| Planned move-ins (`MOVE_IN`) | Saved start date from an in-progress onboarding walk | Requires a valid date, active unit/property and no linked lease. Undated, completed and cancelled walks are omitted. A tenant may still be unselected. |

Onboarding uses the saved overview start date, with a legacy lease-terms fallback. Completing the walk replaces the planned entry with the resulting lease and bill records. A past planned date means the walk remains incomplete; it does not assert whether physical move-in occurred.

All entries are date-only and display without times. Operational today and status use `Asia/Manila`; the interface labels this as Manila time. Status reflects current records and the current Manila day even when viewing a past month. Bill balances use confirmed, non-voided payments, remain at least zero, and preserve legacy paid bills as settled. Amounts display in Philippine pesos.

The feed is restricted to the active organization. The frontend requests the current month or week with an inclusive start and exclusive end, optionally narrowed by property. See the [backend API documentation](../../lease-linq-v2-backend/docs/calendar.md) for authorization, projection rules, validation and row limits.

## Navigation and views

- **Month** shows a Monday-first grid for the selected month. Adjacent-month dates are hidden and the number of week rows varies with the month.
- **Week** shows a Monday-first date grid for seven days, without hourly slots or a per-day entry cap.
- **Agenda** groups the selected month's entries by day in a list. It is the initial default at viewport widths of 767px or less; wider screens default to Month. A valid URL view overrides this default. Resizing does not silently change a chosen view.
- **Previous / Next** move by the current view's period. **Today** returns to the period containing the current Manila day and retains the view and filters.
- **Refresh** requests the current feed again. Returning focus to the window, or selecting Today, refreshes statuses when the Manila day has changed. There is no periodic background refresh.

On compact screens the search field spans the filter row, the property and Show controls share the next row, and the view selector fills the toolbar width. Manually choosing Month or Week retains a 700px minimum grid width with horizontal scrolling inside the calendar viewport.

## Filters and counts

| Control | Behavior |
| --- | --- |
| Search | Matches the entry title, tenant name, unit number and property name. Matching is case-insensitive; every space-separated word must occur somewhere in those fields. Input is trimmed, limited to 120 characters and applied after 200ms. |
| Property | Defaults to All properties. It narrows the server request. Archived properties remain available and are labelled `(archived)` so historical records can be found. The picker enables its own name search when there are more than eight properties. |
| Show | All entries, or Outstanding bills. Outstanding bills includes only bill entries with a positive remaining balance, including upcoming bills; it does not mean overdue only. |
| Entry types | Independently toggles Bills due, Lease ends, Lease starts and Planned move-ins. All four start selected; selecting none is supported. |
| Reset filters | Clears search and property, restores All entries and all four types, and keeps the current period and view. |

Search, Show and entry-type selection operate on the fetched range without another request. Each type button's count applies the current range, property, search and Show scope **before entry-type selection**. Turning a type off therefore leaves its count visible. With Outstanding bills selected, non-bill type counts are zero. Counts show a dash during loading or a feed error.

The result line counts entries after every filter. Its separate “past due or planned date” figure counts only displayed entries whose status is `OVERDUE`: overdue bills and incomplete walks past their planned date. These are entry counts, not unique tenant, unit or lease counts; a lease can contribute both a start and an end.

## URL state

The calendar reads and writes the following query parameters. Updates replace the current browser history entry, making the current state shareable without adding a history entry for every toggle. Date and view serialize explicitly; default optional filters are omitted.

| Parameter | Accepted value | Default / recovery |
| --- | --- | --- |
| `date` | A real `YYYY-MM-DD` date anchoring the displayed period | Current Manila day for an absent or invalid date. Navigation keeps the anchor inside the displayed period. |
| `view` | `month`, `week`, `agenda` | Agenda on an initially compact viewport, otherwise Month. |
| `property` | Property UUID | All properties for an absent or malformed UUID. The API parameter is named `propertyId`. |
| `q` | Search text, at most 120 characters | Empty search. |
| `types` | Comma-separated `BILL_DUE`, `LEASE_END`, `LEASE_START`, `MOVE_IN`, or `none` | All types when omitted or entirely malformed. Recognized values in a mixed list are retained; `none` preserves an intentionally empty selection. |
| `scope` | `all` or `outstanding` | All entries. `all` is omitted when serializing. |

Example: `/calendar?date=2026-09-01&view=agenda&types=BILL_DUE&scope=outstanding` opens September's outstanding bills in Agenda.

## Entries, overflow and source links

Entries carry a type icon, title and unit, tenant or property context, and a visible status label. Status uses the existing semantic tones: overdue/terminated are destructive, paid is success, today/due soon/part paid are warning, and other states are neutral. Color never supplies the only status information. Within a day, overdue entries precede today's entries, followed by the remaining entries, with title and stable ID ordering ties.

Month displays at most two entries per day before a `+N more` popover. Compact grid titles and metadata truncate with an ellipsis; Agenda and the overflow popover wrap these fields and also show the property and any outstanding balance. Opening an entry reveals an inline preview above the calendar with the full date, tenant, location, status, bill amount and outstanding balance where applicable.

| Preview action | Destination |
| --- | --- |
| Open bill | `/bills?billId=<sourceId>`; the bills list is narrowed to that exact bill and provides a way to clear the filter. |
| Open lease | `/leases/<sourceId>` |
| Open onboarding | `/tenants/onboarding/<sourceId>` |

Opening the preview moves focus into it and scrolls it into view. Its Close button and Escape handler return focus to the triggering entry when that element remains connected. Filter changes and feed requests clear the preview.

## Loading, failures and accessibility

The calendar announces loading and result changes, marks its region busy, clears old entries for a new request and dims the loading grid. Refresh is disabled while a feed request runs. A feed failure hides the grid and displays the API error with Retry. Property choices have an independent error and retry action. Empty states distinguish a period without scheduled dates from filters that match nothing, and offer Reset filters when relevant.

Visible field labels, named navigation buttons, pressed states on type/view buttons, descriptive entry labels, keyboard-interactive events and preview focus handling are implemented. Existing global focus outlines apply, and the search wrapper draws a single focus indicator. Calendar color transitions honor reduced motion. These are source-level implementation facts; browser layout, keyboard behavior and contrast have not received visual sign-off.

## Implementation and extension

The feature lives in `src/app/modules/calendar/`: `calendar.ts` coordinates view, feed and focus state; `calendar-state.ts` defines URL parsing, filtering, tones and source navigation; `calendar.service.ts` requests the feed and properties with the cache-bypass header; `calendar.html` and `calendar.css` render the surface. Shared feed types live in `src/app/core/models/calendar.types.ts`.

`@fullcalendar/angular`, `@fullcalendar/core`, `@fullcalendar/daygrid` and `@fullcalendar/list` are deliberately pinned to **6.1.20**, preserving the suggested v6 split-package layout. The installed Angular adapter declares Angular peer support from 12 through 21. The feature uses day-grid and list plugins only.

The surface inherits [DESIGN.md](../DESIGN.md) and [PRODUCT.md](../PRODUCT.md). White and panel surfaces, Ledger Indigo controls, Poppins headings, Work Sans data, tight corners and restrained semantic status fills remain the established system. Calendar-specific spacing and grid rules do not become new global tokens.

Work orders remain a future source. Add them only when the domain records a real scheduled or due date, using a distinct entry type, bounded organization-scoped query, stable source ID, explicit status labels and source navigation. Creation time must not imply a deadline. Any future unissued-rent forecast requires a separately labelled projection contract.

## Validation recorded on 2026-09-05

- Frontend and backend production builds passed. Targeted frontend tests passed: 16. Targeted backend tests passed: 35.
- A read-only local database smoke check returned six September entries for one organization and checked unique IDs, range bounds and property narrowing. No fixtures were inserted.
- The running frontend serves `/calendar` with HTTP 200. Both calendar API endpoints return HTTP 401 without authentication.
- The frontend build reports an initial bundle of 752.25kB, above the 700kB warning budget and below the 1MB hard limit. `calendar.css` is 7.92kB, above its 4kB warning budget and below its 8kB hard limit.
- The design detector ran in degraded regex mode and returned `[]`; it did not evaluate contrast.
- The independent source review's final disposition was `ship` for the three scored fixes: visible status text, overflow-popover readability and the overnight Manila-day refresh. This verdict covers those fixes only. No browser screenshots were available, so responsive visual layout, clipping and contrast remain unverified.
