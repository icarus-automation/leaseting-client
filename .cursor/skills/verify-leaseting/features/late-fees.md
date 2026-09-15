# Late fees

Late fees is a Settings page: one org-wide rule that charges unpaid rent after a grace period. Four fields. Posting is nightly. There is no Billing tools control.

## Sub-features

- `late-fees-card` shows the Late fees card after Charge items.
- `late-fees-open` opens `/settings/late-fees` with the four fields.
- `late-fees-save-blocked` keeps Save disabled while the toggle is on and Post as is empty.
- `late-fees-empty` shows Add a charge item first when no postable (non-Rent, live) item exists.

## How to get to it (user POV)

- Choose `Settings` in `Main navigation`, then the `Late fees` card.
- Open `{origin}/settings/late-fees` while signed in.

## Driving it with Cursor browser

Preconditions:

- Doctor `ok: true` and `api.reachable: true`.
- Signed in as staff.
- Do not leave late fees enabled on a shared seeded org. If you save ON, save OFF before finishing.

- **Hub card.** Choose `Settings`. Heading is `Settings`. Under `Property Management`, the cards include `Charge items` then `Late fees` then `Payment destinations`. `Late fees` description is `Charge a late fee on unpaid rent after a grace period.`
- **Open page.** Choose `Late fees`. Heading is `Late fees`. Breadcrumb includes `Settings`. The form landmark is `Late fees`.
- **Four fields.** Toggle name `Charge late fees`. If the toggle is on, fields are `Grace` (`Grace days`), `Fee` (`Fee basis`, then `Fixed late fee` or `Late fee percent`), and `Post as` (`Post as charge item`).
- **Save blocked.** Turn `Charge late fees` on. Clear Post as if it is filled. `Save` is disabled until a charge item is picked and the fee is positive.
- **Empty catalogue.** Only if `GET /charge-items` has no live non-Rent item: the page shows `Add a charge item first` and a link `Go to Charge items`. Skip this bullet when the seeded `Late fee` item exists.
- **Proof.** Save `{evidence}/late-fees-hub.aria.yml` and `{evidence}/late-fees-hub.png` on `/settings` showing the Late fees card after Charge items. Save `{evidence}/late-fees-page.aria.yml` and `{evidence}/late-fees-page.png` on `/settings/late-fees` showing heading `Late fees` and `Charge late fees`.

## Gotchas

- Billing tools on `/bills` must not gain a late-fee item. Absence there is correct.
- Percent is of remaining unpaid rent, not face value. The hint under `% of balance` says that.
- Turning the toggle on and saving will post arrears on the next run. Leave the toggle off unless the API recipe is also being proven.
