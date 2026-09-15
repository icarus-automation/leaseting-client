# Work Orders

Work Orders is the staff queue for maintenance requests tenants file in Residence Care. Status moves one way: Start (Open to In progress), then Resolve (In progress to Resolved) with an optional note for the tenant. Contract: `docs/fe-maintenance-request-api.md`.

## Sub-features

- `work-orders-queue` opens on the Open tab with counts on Open and In progress.
- `work-orders-tabs` switches Open, In progress, Resolved, All.
- `work-orders-detail` opens a request from its title: notes, photos, tenant, unit, property.
- `work-orders-start` moves an Open request to In progress.
- `work-orders-resolve` moves an In progress request to Resolved, with an optional note.
- `work-orders-badge` shows the org's Open count beside `Work Orders` in the sidebar, hidden at zero.

## How to get to it (user POV)

- Choose `Work Orders` in `Main navigation` (Operations).
- Open `{origin}/work-orders` or `{origin}/maintenance` (redirects) while signed in.
- Command palette: `Work Orders`.

## Driving it with Cursor browser

Preconditions:

- Doctor `ok: true` and `api.reachable: true`.
- Signed in as staff (owner, admin, or member).
- Seeded org: `bun run db:seed:prod` in the API repo adds two requests on Brickstone: unit 106 `Open`, unit 101 `In progress`.

- **Queue.** Heading `Work Orders`. Group `Request status` has buttons `Open (n)` (pressed), `In progress (n)`, `Resolved`, `All`. Table caption `Maintenance requests, newest first`; columns `Request`, `Tenant`, `Unit`, `Submitted`, `Status`. A property select labelled `Property` shows only when the org has more than one property.
- **Detail.** Choose a request title button. The dialog heading is the title, subheading `Unit {unitNo} · {property}`. It shows the status badge, `Submitted {date}`, `Tenant`, `Unit`, `Property`, `Notes`, and `Photos (n)` when the request has photos (`Photo 1 of n` buttons, `Open full size, opens in a new tab`). Footer `Close` plus `Start` (Open) or `Resolve` (In progress). Resolved shows no action.
- **Start.** On an Open request choose `Start`. Toast `Request started`. The dialog closes, `Open (n)` drops by one, `In progress (n)` rises by one. Reopen it from `In progress`: badge `In progress`, `Started by {name}`.
- **Resolve.** On an In progress request choose `Resolve`. Dialog `Resolve request`, field `Note for the tenant (optional)`, submit `Resolve`. Toast `Request resolved`. Find it under `Resolved` with `Resolved by {name}` and the note.
- **Badge.** With at least one Open request, the sidebar link reads `Work Orders, {n} open` and shows `{n}`. After a Start that empties Open, the number disappears without a reload.
- **Proof.** Save `{evidence}/work-orders-queue.aria.yml` and `.png` on the Open tab, `{evidence}/work-orders-detail.aria.yml` and `.png` with a request open, and a before/after pair for each Start or Resolve that includes the reopened request.

## Gotchas

- Start and Resolve are real, one-way mutations on the shared org. There is no reopen. Resolving the seeded requests leaves nothing to work until the API seed is re-run.
- A 409 means someone else moved the request first. The dialog shows the API message and the current status; the queue reloads.
- Photos are private. They load through the session cookie as object URLs, not bare image URLs.
- Tenants file requests; staff cannot create one here. Absence of a create button is correct.
