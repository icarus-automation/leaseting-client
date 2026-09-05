---
version: 1
slug: "src-app-modules-calendar-calendar-html"
primary_target: "src/app/modules/calendar/calendar.html"
related_targets: ["route:/calendar","src/app/modules/calendar/calendar.ts","src/app/modules/calendar/calendar.css","src/app/modules/calendar/calendar-state.ts","src/app/modules/calendar/calendar.service.ts","src/app/core/models/calendar.types.ts"]
---

# Calendar surface brief

## Scope and mode

Operate. `/calendar` is a read-only extension of the established Leaseting app. The implementation inherits `DESIGN.md`; it does not establish a new visual world or change the design sidecar or product record.

## Audience, job and action

Property staff scan operational dates, narrow to the relevant property or source, inspect a milestone, and open the record that needs attention. The main action is source navigation from an inline entry preview. Today provides a direct return to the current operational period while preserving filters.

## Content and constraints

Real organization-scoped leases, issued bills and dated in-progress onboarding walks supply all entries. Dates and statuses use Manila's operational day. Bills include settled history; future rent appears when issued. Move-ins remain explicitly planned until the onboarding flow produces its lease. Work orders require a future source with an actual scheduled/due date. No event creation, dragging, recurrence, speculative dates or fabricated demonstration entries belong to this surface.

## Chosen direction

The artifact's opening contract names the thesis: dates already tracked by property operations, collected into a readable calendar. The first viewport stacks a compact heading and Refresh, visible search/property/scope and type filters, period navigation and view selection, then the calendar. It borrows the familiar operational-calendar pattern requested from Snipe-IT while using the incumbent component language.

The scan moves from month to filtered results to the inline source preview. Month, Week and Agenda are explicit choices; Agenda is the initial default on compact screens. Semantic status text remains visible in compact entries. Type counts retain the currently applicable inventory even when a type is toggled off.

## Memorable interaction

One operational date leads directly to its lease, exact bill or onboarding walk. The preview preserves the calendar context, exposes the source's status and money where relevant, and returns keyboard focus to the entry on close.

## Evidence and unresolved checks

Production builds and the targeted 16 frontend / 35 backend tests passed. A read-only local smoke check returned six September entries for one organization. The source review scored the status-text, overflow-popover and overnight Manila-day fixes resolved; its `ship` disposition covers those three fixes only. Screenshots were unavailable, so visual layout, clipping and contrast remain unverified. The degraded regex detector returned `[]` without contrast evaluation. Bundle and stylesheet warning budgets remain exceeded, below their hard limits.

See [Calendar documentation](../../docs/calendar.md) for implemented filters, URL state, source semantics, accessibility behavior and exact validation limits.
