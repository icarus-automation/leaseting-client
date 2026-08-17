# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — property management staff**: PMs, admins, and coordinators who live in the app all day. Context: desktop workstation, keyboard-heavy, high task frequency. Job: process lease renewals, issue monthly bills and statements, track the maintenance queue, monitor occupancy — without losing anything between sessions.

**Secondary — operators and owners**: individual landlords (solo or small portfolio) and real estate company operators. Interact at a portfolio or property level; less frequent but still power-capable.

**End-users — tenants and owners**: occasional actors via a portal that is committed but not yet built. Light-action surface (view lease and statement, submit requests). Not the core design target. Today they are reached through SMS'd statements, not a login.

## Product Purpose

Leaseting is an all-in-one property management operating system: properties, units, tenants, leases, billing and statements, maintenance, parking, knowledge base, and reporting — single source of truth. It replaces spreadsheets and fragmented point tools.

Success = a property manager who never loses track of an expiring lease, an unpaid bill, a stale maintenance request, or a vacant unit — without needing to remember to check.

## Positioning

Two things a neighboring property SaaS could not truthfully copy:

**Kit — proactive monitoring as a first-class product surface, not a chatbot.** Kit is the named, illustrated assistant that watches org data continuously and raises the thing that needs attention before anyone asks: rent overdue, lease expiring, unit sitting vacant. Its facts are templated and deterministic — never AI-generated. AI (DeepSeek) writes only the commentary layer, and the card degrades to facts alone when it is unset or fails. Severity is always readable as text; Kit's expression is reinforcement, never the only cue. Competitors ship notification bells; this is a character with a point of view whose correctness does not depend on a model being up.

**Systematized speed over CRUD completeness.** Keyboard-first operation (Cmd/Ctrl+K palette, single-key actions), consistent status vocabulary across every view, minimum clicks on high-frequency tasks. Linear is the benchmark for interaction conviction. Legacy property SaaS competes on feature count; this competes on how little the software costs you to operate.

## Operating Context

**Market: Philippines. Binding.** PH rental conventions are product truth, not a localization layer — assume them without hedging:

- ₱ currency. Advance and deposit expressed in **months**, not flat sums.
- **Statement of Account (SOA)** is the billing artifact: bills are selected, an SOA is generated with its own `soaNo`, and it is texted to the tenant via the Semaphore SMS gateway (feature-flagged per backend config).
- Billable types are Rent, Electricity, Water, Internet, **Association Dues**, Other. Payment methods include Cash, Bank transfer, **GCash**, Check, Other.

**Monthly rhythm.** Bills accrue against a lease with a `dueDay` → statement generated → SMS sent → payment recorded. Kit watches the overdue tail.

**Move-in is a guided walk, not a form.** Six ordered steps: Tenant → Requirements → Lease terms → Contract → Move-in payment → Turnover. Steps persist individually; the contract step can be explicitly deferred.

**Multi-tenancy is org-scoped.** Better Auth with the organization plugin; the session must be scoped to an active org or domain endpoints 403. Users belong to one or more orgs and switch between them.

**Reporting is honest about what isn't built.** The report catalog lists unbuilt reports alongside live ones, each naming the feature that blocks it. A manager who can see "Lease Expirations — blocked by X" stops rebuilding it in a spreadsheet.

## Capabilities and Constraints

**Stack.** Angular 21 (standalone, signals, zoneless-era idioms), PrimeNG 21 + `@primeuix/themes`, Tailwind v4, Konva (floor-plan editor), FilePond (uploads), Fuse.js (fuzzy search), hotkeys-js (shortcuts), date-fns. Vitest for tests. Separate backend service on `:8000`, `/api/v1`, responses wrapped in a `{ statusCode, message, data }` envelope except Better Auth routes, which are raw.

**Built and live:** dashboard, properties (incl. floor-plan editor and viewer), tenants, leases, bills + SOA, tenant onboarding walk, knowledge base, reports, settings (org-curated property types), Kit event feed, auth.

**Stubbed with a published feature list (`ComingSoon`):** work orders / maintenance — committed scope, status vocabulary defined (Open → In Progress → Waiting on Vendor → Resolved → Closed).

**Separate deployed app:** parking lives at `parking.leaseting.com` and is reached from a "Connected Apps" section in the sidebar, not from an in-app route. The in-app `/parking` route is a `ComingSoon` placeholder describing the spot inventory (Available / Assigned / Reserved / Out of Service), assignments tied to units and leases, and utilization reporting. Treat Leaseting as one product with at least one satellite app, not a single monolith.

**Not built:** the tenant/owner portal. Committed scope, no routes yet.

**Terminology drift from the original PRD — the code is authoritative.** Unit status is derived by the backend from active leases and is binary (`OCCUPIED` / `VACANT`), not the PRD's five-state list. Leases carry no status enum; state is derived from dates and `terminatedAt`. Property types are org-curated data fetched from `/property-types`, not a hardcoded enum.

**Open product decisions.** Kit's phase-2 conversational Q&A and guided actions are described in the PRD but uncommitted. Rent Roll reporting is deferred. Per-org configurable Kit thresholds are specified but not shipped.

## Brand Commitments

**Name:** Leaseting. **Assistant:** Kit — confirmed name, with shipped illustrated art.

**Logo:** The supplied green/white artwork is the canonical Leaseting identity. Render `public/brand/leaseting-lockup-on-dark.png` directly in the persistent sidebar brand row and on the sign-in panel; do not synthesize a backing, recolor, filter, crop, or substitute the asset. Never place product branding inside dashboard page content. Its embedded green is a fixed logo color, not a replacement for the existing Ledger Indigo interface palette or semantic status colors.

**Personality: efficient, clean, decisive.** Speed is the brand. No wasted motion. Every interaction is justified. The product feels like a professional tool that respects the user's time and makes them look competent.

Kit's own tone is a secretary's, not a mascot's: it reports a fact and points at the thing to act on. Five moods exist and are semantic, not decorative — neutral, concern, sad, happy, thinking.

## Evidence on Hand

**Pre-launch. No real customers, no production usage.** All data in the app is seeded.

Future work must **not** fabricate: testimonials, customer logos, case studies, named orgs, occupancy or revenue benchmarks, pricing, uptime or performance claims, review scores, or "trusted by N companies" figures. None exist. Where a surface needs content, use realistic synthetic property/tenant data and label it as such where the distinction matters.

**Real assets that do exist:**

- `public/brand/leaseting-mark-green.png` — transparent primary mark for light app chrome, compact headers, and browser identity.
- `public/brand/leaseting-lockup-on-dark.png` — transparent green/white horizontal lockup for dark brand surfaces.
- `public/brand/leaseting-mark-black-on-white.png` and `public/brand/leaseting-lockup-on-black.png` — supplied alternate background-specific exports; retain for contexts that exactly match their baked-in backgrounds.
- `public/kit/` — Kit full-body art in 5 moods (`kit-{neutral,concern,sad,happy,thinking}.png`), plus `kit-upsidedown.png` and `kit-dashboard-backdrop.png`.
- `public/kit/square/` — purpose-drawn 1:1 head shots for badge/avatar contexts where the full body is illegible.
- `PRD.md` — original product brief. Historical; superseded by this record where they conflict.
- `DESIGN.md` — the visual system of record.

## Product Principles

1. **Speed is respect** — every task completes in the fewest steps possible; power users operate entirely by keyboard; latency, visual or functional, is a failure.
2. **Surface before search** — the right information appears before it's requested. Kit embodies this at the system level; every view embodies it at the glance level.
3. **Status is never ambiguous** — every entity carries a clear state. Users should never have to wonder whether something needs attention.
4. **Deterministic facts, optional flourish** — anything a manager acts on is computed and templated. AI, animation, and personality are additive layers that can fail without taking the fact with them.
5. **Say what isn't built** — unbuilt features are listed with what blocks them, not hidden. Being visibly honest about scope is cheaper than a manager quietly keeping a parallel spreadsheet.

## Accessibility & Inclusion

WCAG AA minimum throughout. Keyboard-first focus management (command palette, single-key shortcuts, visible focus rings). `prefers-reduced-motion` honored on all transitions. Full-day screen use: body text contrast targets ≥7:1 where practical, 4.5:1 absolute minimum. Status colors must never be the sole differentiator — pair with label or icon. This applies to Kit: severity is always readable as text, never carried by expression or color alone.
