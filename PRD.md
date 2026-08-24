# Leaseting — PRD (AI Context)

Property management SaaS — systematized, all-in-one operating system for property ops: properties, units, tenants, leases, billing + statements, maintenance, parking, knowledge base, reporting. Replaces spreadsheets. Core value = systematization + UI/UX quality: fast, keyboard-first, Linear-style polish (ref: linear.app) — not a generic CRUD tool. Users: property mgmt companies, real estate companies, individual owners — solo landlord to large portfolio.

**Market: Philippines. Binding.** ₱ currency. Advance/deposit in **months**, not flat sums. Statement of Account (SOA) is the billing artifact, texted to tenants. GCash is a first-class payment method. PH conventions are product truth, not a localization layer.

**Assistant:** Kit — named, illustrated proactive secretary (not a notification bell). Facts are templated + deterministic; AI writes only the commentary layer and can fail without taking the fact with it.

**Doc roles.** This file = scope + build status. `PRODUCT.md` = product record (positioning, principles, evidence) — authoritative on product truth. `DESIGN.md` = visual system of record. Code is authoritative over all three on data shapes.

Status key: **[built]** · **[partial]** · **[stub]** — route exists, `ComingSoon` placeholder w/ published scope · **[planned]** — no route.

## Stack

Angular 21 (standalone, signals, OnPush), PrimeNG 21 + `@primeuix/themes`, Tailwind v4, Konva (floor-plan editor), FilePond (uploads), Fuse.js (palette search), hotkeys-js, date-fns. Vitest.

Separate backend on `:8000`, `/api/v1`, responses wrapped `{ statusCode, message, data }` — except Better Auth routes, which are raw. Better Auth + organization plugin: **session must be scoped to an active org or domain endpoints 403**. Media on R2 via proxy. DeepSeek = Kit commentary + receipt OCR. Semaphore = SMS gateway, feature-flagged per backend config (`features.sms`).

## UI/UX — core product value

**[built]** Cmd/Ctrl+K command palette — fuzzy nav (Fuse.js), quick-create actions, live tenant search. Consistent status vocabulary + `StatusBadge` across views. Shared shell: `FormDialog`, `Stepper`, `Pagination`, `Skeleton`, `EmptyState`, `ErrorBanner`, `ImageDropzone`, `ComingSoon`, Kit widgets.

**[partial]** Rich single-key shortcuts beyond the palette. **[planned]** Lightweight responsive portal for tenants/owners — desktop staff experience only today.

## Modules

**Auth** **[built]**
Email/password sign-in, forgot-password, `authGuard`/`guestGuard`, org list + set-active. Routes: `/login`, `/login/forgot-password`.

**Property & Unit Mgmt** **[built]** — `/properties`, `/properties/:id`
Property: name, type (**org-curated data from `/property-types`, not an enum**), addressLine, city, image. Floors: level, name, plan image. Unit: unitNo, monthlyRent, `mapCoordinates` (normalized 0–1 polygon), notes.
**Unit status is derived by the backend from active leases and is binary: `OCCUPIED` / `VACANT`** — plus a separate `hasOverdueBills` flag. The original five-state list (Reserved / Under Maintenance / Action Required) is **not** implemented.
Floor-plan editor (Konva) + viewer, floor tabs, map-units panel, unit panel w/ active lease + outstanding bills. Per-property `unitSummary`: total / settled / overdue / vacant.
**Not built:** owner, amenities, beds/baths/sqft, bulk add/import, audit log.

**Tenant Mgmt** **[built]** — `/tenants`, `/tenants/:id`
Tenant: name, email, contactNo, photo, notes, documents. Detail rolls up leases, bills, `outstandingBalance`, `unpaidBillCount`, `nextDueDate`.
**Not built:** emergency contact.

**Tenant Onboarding (move-in)** **[built]** — `/tenants/onboarding/:id`
Move-in is a guided walk, not a form. Eight ordered steps: **Overview → Tenant → Requirements → Lease terms → Deposit → Contract → Move-in payment → Turnover**. Steps persist individually; contract step can be explicitly deferred. Status: `IN_PROGRESS` / `COMPLETED` / `CANCELLED`. Completing the walk produces the lease.
- **Overview** anchors the lease: property → unit → start/end dates.
- **Requirements** pre-ticks anything already filed on the tenant's profile from an earlier onboarding, and links the document.
- **Lease terms** is a free list of rent charge lines drawn from the org's charge catalogue; their sum becomes `monthlyRent`, and the breakdown is snapshotted onto `lease.rentCharges`.
- **Deposit** asks the same question twice — "collecting advance rent?" and "holding a security deposit?" — each a Yes/No with a month count. Both are multiples of the monthly rent above, so neither restates the charge lines behind it; answering Yes requires at least 1 month.
- Completion posts one advance RENT bill and one security-deposit bill, each with the move-in payment applied against it.

**Lease Mgmt** **[built]** — `/leases`
Lease: unit, tenant, startDate, endDate, monthlyRent, `dueDay`, `terminatedAt`, notes, bills.
**Leases carry no status enum** — state is derived from dates + `terminatedAt` (`lease-status.util.ts`). The Draft → Pending Signature → Active → Expiring Soon → Expired/Renewed/Terminated pipeline is **not** modeled. Multi-cosigner is **not** implemented (one tenant per lease).

**Billing, Payments & SOA** **[built]** — `/bills`, `/bills/soa`, `/bills/utility-run`
*Not in the original PRD — this is the monthly heartbeat of the product.*
Bill types: Rent · Electricity · Water · Internet · **Association Dues** · Other. Status `UNPAID` / `PAID`, with `paidAmount` / `balance` for partials. Filters: lease, tenant, status, type, dueToday, overdue, hasReading. Summary buckets: unpaid / overdue / due-today.
Payments: amount, paidOn, method (Cash · Bank transfer · **GCash** · Check · Other), referenceNo, notes, uploaded receipt.
Utility bills carry a meter-reading breakdown — period, previous/present reading, multiplier, admin fee rate, VAT rate, withholding rate. Server derives the amount. Water supports Maynilad-style derived rate (provider total ÷ total consumption).
**Utility billing run:** per-property batch — preview rows seeded from each lease's last reading, enter present readings, create bills in one pass (due date = each lease's `dueDay`), skipped rows reported with reasons. **AI receipt scan:** photograph a Meralco/Maynilad bill to prefill the run.
**SOA:** select bills → generate statement w/ `soaNo`, statementDate, totalDue → optional SMS (Semaphore, flag-gated). `smsStatus`: NOT_SENT / SENT / FAILED.

**Maintenance & Work Orders** **[stub]** — `/work-orders` (`/maintenance` redirects here)
Committed scope, published on the placeholder: queue Open → In Progress → Waiting on Vendor → Resolved → Closed; priority + assignee; requests linked to unit and tenant; resolution-time per property.

**Parking** **[stub, satellite app]**
Ships as a **separate deployed app** at `parking.leaseting.com`, reached from "Connected Apps" in the sidebar — not an in-app route. Placeholder component exists but is **not wired into `app.routes.ts`**. Scope: spot inventory (Available / Assigned / Reserved / Out of Service), assignments tied to units and leases, flags occupied units with no spot, utilization reporting. Treat Leaseting as one product with at least one satellite app.

**Knowledge Base** **[partial]** — `/knowledge-base`
Article list + client-side search; one full article shipped (`/knowledge-base/utility-billing`). Articles are hardcoded, not authored data. **Not built:** categories, visibility scoping (internal/owner/tenant/public), tags, author, server-side full-text search.

**Reporting** **[partial]** — `/reports`
Catalog-driven: `report-catalog.ts` is the single source of truth, 7 groups (Business Overview · Revenue · Who Owes You · Portfolio & Leases · Utilities · Documents & Audit · Parking). **Unbuilt reports stay listed with a `blockedBy` reason** — visible honesty beats a manager quietly keeping a parallel spreadsheet.
Live: **Portfolio Overview**, **Revenue by Tenant** (BILLED/COLLECTED basis), **A/R Aging — Summary**, **A/R Aging — Detail**, **Delinquency & Reminders**. Plus favorites, shared filters, as-of date, CSV export (all unit-tested).
Owed: Rent Roll · Lease Expirations · Occupancy by Property · Vacant Units · Tenant Directory · Move-ins/Move-outs · Bill + Payment Registers · Statements Issued · Utility Consumption + Run Summary. Blocked on missing features: P&L / Cash Flow / Owner Statement (Expenses, Owners) · Deposits Held (deposit tracking) · all Parking reports (Parking app integration).
**Not built:** role-scoped dashboards (PM / Admin / Owner / Tenant).

**Kit — proactive monitoring** **[built]** — dashboard card + `/kit`
Event types shipped: `RENT_OVERDUE` · `LEASE_EXPIRING` · `UNIT_VACANT`. Severity `INFO` / `WARNING` / `URGENT`, always readable as text — expression and colour are reinforcement, never the only cue. `message` is templated and deterministic; `flavor` is AI commentary and is null when DeepSeek is unset or fails. Dismissible, one card at a time ("this one today", not a feed). Nightly sweep, no polling. Five moods (neutral / concern / sad / happy / thinking) with full-body + 1:1 head art; celebration capped at 2.5s — a mascot that never stops moving is the Clippy failure mode.
**Ask Kit** **[built]** — conversational Q&A grounded in org data, at `/kit`: conversation list, start, send, delete. This was PRD phase 2; it shipped.
**Not built:** per-org configurable thresholds · guided actions w/ confirmation (e.g. draft renewal notice) · configurable tone · global unread badge.

**Settings** **[partial]** — `/settings`
A grouped index of cards, one per configurable area, each on its own child route.
- **General → Organization** — listed, marked *Soon*, not built.
- **Configuration → Property types** (`/settings/property-types`): create, rename, archive (archived types stay attached to existing properties, hidden from pickers).
- **Configuration → Charge items** (`/settings/charge-items`): the catalogue behind the onboarding wizard's rent charge lines — name, bill type, optional default amount; create, edit, archive. Also addable inline from the wizard.
Catch-all names ("Other") sort last in both lists rather than alphabetically.
Nothing else yet — no org profile, members, roles, or Kit thresholds.

**Tenant / Owner Portal** **[planned]**
Committed scope, no routes. Tenants are reached today by SMS'd statements, not a login.

## Known gaps → priority order

1. Work orders — the only stubbed *core* module; backs the "needs attention" story.
2. Expenses + Owners — unblocks 3 finance reports and the owner relationship.
3. Rent Roll + Lease Expirations — highest-demand reports, no blocker, just unbuilt.
4. Settings depth — members, roles, Kit thresholds.
5. Tenant portal — turns SMS into a surface.
6. Audit log + bulk import — enterprise table stakes, absent everywhere.

## Non-negotiables

Pre-launch: **no real customers, no production usage, all data seeded.** Never fabricate testimonials, logos, case studies, named orgs, occupancy/revenue benchmarks, pricing, or uptime claims.
WCAG AA minimum. Keyboard-first focus management, `prefers-reduced-motion` honored, status colour never the sole differentiator.
