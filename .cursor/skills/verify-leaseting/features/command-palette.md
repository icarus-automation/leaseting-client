# Command palette

The command palette is the keyboard-first jump list: go to any staff page, run create/filter actions, and search tenants by name.

## Sub-features

- `palette-open-button` opens the palette from the header search control.
- `palette-open-hotkey` opens the palette with Control+K.
- `palette-goto` navigates to a page from a Go to result.
- `palette-action-create` runs `New property` / `Onboard tenant` / `New bill`.
- `palette-empty` shows a no-match state.
- `palette-dismiss` closes the palette without navigating.

## How to get to it (user POV)

- Choose `Search (Ctrl+K)` in the signed-in header.
- Press Control+K (Windows/Linux) while signed in.
- Press Escape to dismiss.

## Driving it with Cursor browser

Preconditions:

- Doctor `ok: true` and `api.reachable: true`.
- Signed-in app shell is visible (`Main navigation`, header search).
- Start from `/dashboard` unless a step says otherwise.

- **Header entry.** Choose `Search (Ctrl+K)`. A dialog named `Command palette` appears. The searchbox name is `Search pages, actions, or tenants`. A listbox named `Results` includes `Dashboard`, `Properties`, and `Bills`.
- **Hotkey entry.** Close the palette (Escape). Press Control+K. The same dialog appears. Skip on a layout where the browser or host eats the chord; then report the skip and use the header button.
- **Go to Properties.** Type `properties` in the searchbox. Choose the option `Properties` (or activate the selected option with Enter). The palette closes. The page heading is `Properties`.
- **Create action.** Reopen the palette, type `new property`. Choose `New property` with hint `Create`. The properties heading is visible and dialog heading `New property` is open. Choose `Cancel`.
- **Empty state.** Reopen the palette, type `zzzxq`. The list reads `Nothing matches “zzzxq”. Try a page name, an action, or a tenant.`
- **Dismiss.** Press Escape or click the backdrop. The `Command palette` dialog is gone and the underlying page heading is unchanged.
- **Proof.** Save `{evidence}/palette-open.aria.yml` and `{evidence}/palette-open.png` while the dialog is open with `Results` showing at least `Dashboard` and `Properties`. Identity must include Leaseting chrome behind or the dialog label `Command palette`.

## Gotchas

- The palette exists only inside the authenticated shell. It is not on `/login`.
- Tenant rows appear after a short debounce against the API. Wait for the listbox to settle; do not assert on a single keystroke.
- `View unpaid bills` is a filter action to `/bills?status=UNPAID`, not a create dialog.
- `Onboard tenant` creates a server-side onboarding. Cancel it if you are only proving the palette.
- Group headers (`Go to`, `Actions`) are `aria-hidden`. Activate the `option`, not the group label.
