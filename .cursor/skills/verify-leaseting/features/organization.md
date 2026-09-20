# Organization

Organization is a Settings page for the active company: name, address, and the display name shown in the header. There is no logo upload.

## Sub-features

- `org-card` shows a live Organization card under General, with no Soon badge.
- `org-open` opens `/settings/organization` with Company name, Address line, City, and Save.
- `org-save-invalid` keeps the page on the form and shows `Enter a company name.` when name is empty.
- `org-save-reload` keeps the saved name and address after a full reload.

## How to get to it (user POV)

- Choose `Settings` in `Main navigation`, then the `Organization` card.
- Open `{origin}/settings/organization` while signed in.

## Driving it with Cursor browser

Preconditions:

- Doctor `ok: true` and `api.reachable: true`.
- Signed in as an owner or admin.
- Use a clearly fake company name (`Verify org {timestamp}`) and restore the previous name before finishing if this is a shared org.

- **Hub card.** Choose `Settings`. Heading is `Settings`. Under `General`, the card `Organization` is a link. Description is `Company name, address, and branding.` There is no `Soon` badge on that card. The card has a building icon in a light circle.
- **Open page.** Choose `Organization`. Heading is `Organization`. Breadcrumb includes `Settings`. The form landmark is `Organization`. Fields are `Company name`, `Address line`, and `City`. Submit is `Save`.
- **Invalid name.** Clear `Company name` and choose `Save`. The URL stays `/settings/organization`. The page shows `Enter a company name.` No success toast.
- **Save and reload.** Fill `Company name`, `Address line`, and `City`. Choose `Save`. A toast summary `Organization saved` appears. Reload the page. The three fields still show the saved values. The header organization name matches `Company name`.
- **Proof.** Save `{evidence}/organization-hub.aria.yml` and `{evidence}/organization-hub.png` on `/settings` showing the live Organization card under General. Save `{evidence}/organization-page.aria.yml` and `{evidence}/organization-page.png` on `/settings/organization` showing heading `Organization` and `Company name`. After save and reload, save `{evidence}/organization-reload.aria.yml` and `{evidence}/organization-reload.png` with the saved values still in the fields.

## Gotchas

- Viewers see the same fields as readonly and the copy `Only owners and admins can change organization details.` There is no Save button. Skip the save bullets unless the session is owner or admin.
- Company name is also the header display name. There is no separate branding field and no logo control.
- Empty address and city are allowed. Do not treat blank address as a validation error.
- Guest `/settings/organization` redirects to `/login`. That is auth, not an Organization failure.
