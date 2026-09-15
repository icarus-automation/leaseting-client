# Bills

Bills is the money worklist: unpaid and overdue charges, a new-bill dialog, and tools for SOA, utility runs, and rent generation.

## Sub-features

- `bills-list` shows the bills heading, summary tiles, and table or empty/error state.
- `bills-new-open` opens the new-bill dialog from each supported entry point.
- `bills-filter-overdue` narrows the list from the Overdue summary tile.
- `bills-tools-soa` opens Statements of Account from Billing tools.
- `bills-tools-utility` opens the utility billing run from Billing tools.
- `bills-submissions-nav` opens Payment submissions from `Main navigation`.

## How to get to it (user POV)

- Choose `Bills` in `Main navigation`.
- Open `{origin}/bills` while signed in.
- Choose `New bill` on the dashboard or in the command palette.
- Choose `New bill` on the bills header.
- Choose `Billing tools` then `SOA`, `Generate SOA`, `Utility run`, or `Generate rent bills`.
- Choose `Payment submissions` in `Main navigation`.

## Driving it with Cursor browser

Preconditions:

- Doctor `ok: true` and `api.reachable: true`.
- Signed in as staff. Recording a payment or generating rent requires an owner/admin (`isFinancialAdmin`); opening the list and dialogs does not.
- Do not generate rent bills or create a bill against a real lease unless the task is specifically to prove that mutation. Prefer open/cancel for the seed recipe.

- **Open list.** Choose `Bills` in `Main navigation`. Heading is `Bills`. Subtitle is `Rent and utility charges: unpaid, overdue, and settled.` Summary tiles include `Overdue`. Header controls: `Billing tools` and `New bill`.
- **Overdue filter.** Choose the `Overdue` tile. The tile stays selected (destructive border treatment). The list is filtered to past-due bills, or empty if none exist. That empty filtered list is still a pass for the filter control.
- **Open create (header).** Choose `New bill`. Dialog heading is `New bill` with subheading `Charge a lease for rent or utilities.` Lease field label is `Lease` (`#bill-lease`) unless a lease was preset. Choose `Cancel`.
- **Open create (deep link).** Navigate to `{origin}/bills?create=1`. The same dialog opens.
- **SOA tool.** Choose `Billing tools` (`aria-haspopup="menu"`), then `SOA`. Heading becomes `Statements of Account`. Choose `Bills` in the breadcrumb or nav to return.
- **Utility run tool.** Choose `Billing tools`, then `Utility run`. Heading is `Utility billing run`. Return via nav `Bills`.
- **Payment submissions.** Choose `Payment submissions` in `Main navigation`. Heading is `Payment submissions`.
- **Proof.** Save `{evidence}/bills-list.aria.yml` and `{evidence}/bills-list.png` on `/bills` showing heading `Bills`, `Billing tools`, `New bill`, and the `Overdue` tile. If a dialog was opened, also save `{evidence}/bills-new-dialog.png` with heading `New bill`.

## Gotchas

- `Generate rent bills` is a real bulk mutation. Do not choose it on a shared seeded org unless the task is that mutation and you capture the resulting bill list.
- `Generate SOA` opens a dialog that can SMS tenants when SMS is enabled for the org. Prefer `SOA` (the list) for navigation proof.
- Quick filter tiles and the natural-language filter bar both narrow the table. Clear one before asserting the other.
- Payment recording is owner/admin. A non-admin still sees bills; missing `Record payment` is role, not a broken page.
- `/maintenance` redirects to `/work-orders` (the maintenance request queue), not to bills.
