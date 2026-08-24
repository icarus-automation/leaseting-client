# Handoff — surface the rent charge breakdown on Lease detail and the SOA

## Context

Leases created through the onboarding wizard now carry an itemised rent
breakdown. The **Lease terms** step is a free list of charge lines picked from
an org-curated catalogue (`charge_items`, managed at Settings → Charge items).
Their sum becomes `leases.monthly_rent`; the lines themselves are snapshotted
onto `leases.rent_charges` (JSONB).

```jsonc
// leases.rent_charges — snapshotted at onboarding completion
[
  { "name": "Monthly Rent", "billType": "RENT", "amount": 6500 },
  { "name": "Parking", "billType": "OTHER", "description": "Slot B2", "amount": 1500 }
]
```

The snapshot is deliberate: renaming or archiving a catalogue item must never
rewrite a lease that has already gone out. `monthly_rent` stays the single
authoritative figure — nightly rent generation, reports and every existing
balance calculation read it and must keep reading it.

Today that breakdown is visible in exactly two places: the onboarding wizard's
turnover recap, and the unit panel on the property page
(`units.service.ts` → `activeLease.rentCharges`, via
`lease-rent-charges.util.ts`). **This task extends it to Lease detail and the
Statement of Account.** Nothing about how rent is *billed* changes.

## Scope

1. **Lease detail** — show the lines that make up the monthly rent.
2. **SOA** — itemise the RENT line of a generated statement, in both the
   on-screen statement and the generated Excel workbook.

Out of scope: editing charges after a lease exists, per-charge bills,
retro-fitting historical data.

---

## Part 1 — Lease detail

### Current state

There is **no lease detail page yet**. `lease-linq-v2/src/app/modules/leases/`
contains only the list (`leases.ts` / `leases.html` / `leases.routes.ts`).
The backend already has the detail endpoint and response:

- `lease-linq-v2-backend/src/modules/leases/leases.service.ts`
  - `LeaseResponse` (l.14) → `LeaseListItem` (l.28) → `LeaseDetail` (l.42)
  - `leaseRelationsSelect` (l.47) pulls tenant + unit + property
- `GET /leases/:id` in `leases.controller.ts`

**Decide first:** whether this ships as a new `/leases/:id` page or as an
expandable row / drawer on the existing list. A full detail page is the more
useful end state, but it is a bigger piece of work than the breakdown itself —
if the goal is just to expose the breakdown, an expandable row is enough. Pick
one and say which in the PR description.

### Backend

`rentCharges` is **not** currently on the lease wire shape. Add it:

1. `leases.service.ts` — add `rentCharges: LeaseRentCharge[] | null` to
   `LeaseResponse`, and map it in whatever builds the response.
2. Reuse the existing validator rather than writing a second one:
   `src/modules/properties/lease-rent-charges.util.ts` exports
   `toRentCharges(value: Prisma.JsonValue | null): LeaseRentCharge[] | null`.
   It returns `null` for anything malformed — `rent_charges` is free-form JSON
   and must never be trusted straight onto the wire.
   Consider moving that util to `src/common/utils/` now that two modules use
   it, and re-exporting from the old path so nothing breaks.
3. Prisma selects: if the lease queries use an explicit `select`, add
   `rentCharges: true`. If they use `include`, it comes through already.

### Frontend

- `lease-linq-v2/src/app/core/models/lease.types.ts` (or wherever `LeaseListItem`
  lives) — add `rentCharges: ChargeLine[] | null`, importing `ChargeLine` from
  `core/models/charge-item.types.ts`.
- Render the same way the unit panel does — see
  `modules/properties/components/unit-panel/unit-panel.html`, the "Monthly rent"
  row. Match it rather than inventing a second treatment:
  - The total stays the headline figure.
  - Lines render indented beneath it, `name · description` on the left, amount
    on the right, at `text-[12.5px] text-muted`.
  - **Only render the breakdown when `charges.length > 1`.** A single
    "Monthly Rent 6,500" under a "Monthly rent 6,500" total is noise.
  - `rentCharges === null` (older leases, hand-entered leases) → render nothing
    extra. This is the common case for existing data and must look deliberate,
    not broken.

---

## Part 2 — SOA

### Current state

`lease-linq-v2-backend/src/modules/soa/`

- `soa.service.ts` l.98 builds `lines: SoaLine[]`, one per selected bill.
  A utility bill becomes a `SoaUtilityLine` (meter readings, admin fee, VAT,
  WHT); everything else becomes a `SoaFlatLine`.
- `soa-workbook.util.ts` defines `SoaUtilityLine` / `SoaFlatLine` / `SoaLine`
  and renders the Excel workbook.
- The line array is **persisted** to `soa_statements.lines` (JSONB) at
  generation time and the workbook is written to R2 (`file_key`).

That last point is the important one: **a statement is a historical record.**
It is rendered from its own stored snapshot, not recomputed. Never backfill
`lines` on existing rows.

### The change

Give `SoaFlatLine` an optional breakdown:

```ts
export interface SoaFlatLine {
  kind: 'flat';
  label: string;
  description: string;
  dueDate: string;
  netDue: string;
  /**
   * Charge lines behind a rent bill, snapshotted from lease.rentCharges at
   * generation time. Absent on utility bills, on non-rent bills, on leases
   * with no breakdown, and on every statement generated before this existed.
   */
  breakdown?: { label: string; amount: string }[];
}
```

In `soa.service.ts`:

1. Include `rentCharges` on the lease the statement is generated for.
2. When `bill.type === BillType.RENT` and the lease has a breakdown of more
   than one line, attach `breakdown` to that flat line.
3. **Amounts are display-only.** `netDue` is the *balance* (amount minus
   payments) — a partially paid rent bill's breakdown will not sum to it.
   Either label the breakdown as the full monthly charge, or omit it on
   partially paid bills. Prefer the former and label it clearly; silently
   showing lines that do not add up to the total is worse than showing none.
   Decide, and put the reasoning in a comment.

In `soa-workbook.util.ts`:

- Render breakdown rows indented under the rent row, in the muted style already
  used for secondary rows.
- The workbook builder must tolerate `breakdown` being absent — old snapshots
  are re-rendered through this same code path when a statement is re-downloaded.

Frontend: `modules/bills/pages/soa-list/` and
`modules/bills/components/generate-soa-dialog/` — mirror the same indented
treatment wherever the lines are shown on screen.

---

## Migration

**No database migration is required.** Concretely:

- `leases.rent_charges` already exists (migration
  `20260822000000_add_charge_items_and_lease_rent_charges`) and is already
  populated by onboarding completion and by `prisma/seeds/`.
- `soa_statements.lines` is JSONB with no enforced schema, so adding an
  optional `breakdown` key needs no DDL.
- Both are **read-path only** changes on the backend plus rendering on the
  frontend.

Two data realities to handle in code rather than in SQL:

- Leases created before this feature, and any lease entered by hand rather than
  through the wizard, have `rent_charges = NULL`. Degrade to the single
  monthly-rent figure.
- Statements generated before this change have no `breakdown` in their stored
  `lines`. Leave them alone — re-rendering them without a breakdown is correct.

## Definition of done

- Lease detail (page or expanded row) shows the breakdown when there is more
  than one line, and shows nothing extra when `rentCharges` is null.
- A newly generated SOA for a multi-charge lease itemises its rent line on
  screen and in the downloaded workbook.
- An SOA generated **before** this change still opens and downloads unchanged.
- `bun x jest` green in `lease-linq-v2-backend`; `bun x ng build` green in
  `lease-linq-v2`.
- Existing SOA tests (`soa.service.spec.ts` if present) extended to cover a
  lease with and without `rentCharges`.

## Project rules

Read before writing code — they are enforced in review:

- `lease-linq-v2/.claude/rules/angular-standards.md` (signals, `input()`/`output()`,
  native control flow, Tailwind-first, no `ngClass`/`ngStyle`, OnPush)
- `lease-linq-v2/.claude/rules/theming.md` (theme tokens only, never raw hex)
- `lease-linq-v2/.claude/rules/architecture.md` (feature folders, lazy routes)
- `lease-linq-v2-backend/.claude/rules/development-standards.md`
