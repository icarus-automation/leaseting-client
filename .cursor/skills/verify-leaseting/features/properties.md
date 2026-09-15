# Properties

Properties lets staff list buildings, add one with name, type, address, and city, reopen it from the card, and archive it from the list.

## Sub-features

- `prop-list` shows the properties grid, empty state, or load error.
- `prop-create-open` opens the create dialog from each supported entry point.
- `prop-create-save` persists a property and shows it on the list.
- `prop-open-detail` opens floor plans from a card.
- `prop-create-cancel` discards an unfinished dialog without adding a row.

## How to get to it (user POV)

- Choose `Properties` in `Main navigation`.
- Open `{origin}/properties` while signed in.
- Choose `New property` on the dashboard.
- Choose `New property` in the command palette (hint `Create`).
- Choose `New property` on the properties page (header or empty-state CTA).
- Choose a card named `{property name}, open floor plans`.

## Driving it with Cursor browser

Preconditions:

- Doctor `ok: true` and `api.reachable: true`.
- Signed in as staff who can see the org portfolio.
- For save: pick a unique name `Verify skill {timestamp}`. Do not overwrite a real building. Archive the fixture afterward if the org is shared.

- **Open list.** Choose `Properties` in `Main navigation`. The heading is `Properties` and the subtitle is `Buildings, floors, and unit occupancy.` Either property cards, `No properties yet`, or an alert with `Retry` is visible.
- **Open create (header).** Choose `New property`. Dialog heading is `New property` with subheading `Add a property you own or manage.` Fields: `#property-name` (`Name`), type group labelled `Type`, `#property-address` (`Address line`), `#property-city` (`City`). Primary submit is `Create property`.
- **Open create (empty).** If the list is empty, choose the empty-state `New property` instead. Same dialog.
- **Open create (deep link).** Navigate to `{origin}/properties?create=1`. The same dialog opens and the `create` query param is stripped.
- **Cancel draft.** Type `Discard me` into `Name` and choose `Cancel`. If a discard confirm appears, choose `Cancel` or the confirm's discard control so the dialog closes. The list has no card named `Discard me`.
- **Save property.** Reopen create. Fill `Name` with the unique fixture name, pick an existing type (chip `aria-pressed` or the `Pick a type` select), fill `Address line` and `City`. Photo is optional. Choose `Create property`. A success toast `Property created` appears. The list includes a heading with the fixture name.
- **Open detail.** Choose the card link `{fixture name}, open floor plans`. The detail breadcrumb is present and the property name is visible. Choose `Properties` or the breadcrumb to return.
- **Proof.** From the list, save `{evidence}/properties-list.aria.yml` and `{evidence}/properties-list.png` showing the heading `Properties` and the fixture card (or the empty state if save was skipped). After save, reload `{origin}/properties` and confirm the fixture still appears.

## Gotchas

- Type chips appear when there are eight or fewer types; more types switch to a filterable `Pick a type` select. Both are valid.
- `This field is required.` is the create-form required copy (not the login page's `Email is required.`).
- Archive is `Archive {name}` on the card, then confirm header `Archive property` / accept `Archive`. Only archive the fixture this run created. Active leases block archive (`Cannot archive`).
- Occupancy badges on the card are `Settled`, `Overdue`, `Vacant` — derived from leases, not typed in the create dialog.
- Do not call `POST /properties` outside the dialog.
