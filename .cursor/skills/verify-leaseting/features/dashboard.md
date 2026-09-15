# Dashboard

Dashboard is the signed-in home: Kit's briefing, occupancy and billing overview, and the three primary create actions.

## Sub-features

- `dash-open` shows the authenticated shell and Kit greeting.
- `dash-kit` shows Kit's named briefing (an event, all-clear, or set-aside state) with severity as text.
- `dash-overview` shows the `Property management` section, or first-run `Set up your portfolio` when the org has no properties.
- `dash-quick-property` starts a new property from the dashboard.
- `dash-quick-tenant` starts tenant onboarding from the dashboard.
- `dash-quick-bill` starts a new bill from the dashboard.

## How to get to it (user POV)

- Sign in successfully (lands on `/dashboard`).
- Choose `Dashboard` in `Main navigation`.
- Choose the brand control `Leaseting dashboard`.
- Open `{origin}/dashboard` while signed in.
- Open `{origin}/` while signed in (redirects to `/dashboard`).

## Driving it with Cursor browser

Preconditions:

- Doctor `ok: true` and `api.reachable: true`.
- A staff session exists (complete `signin-success`, or a cookie this run is allowed to use).
- `{origin}/dashboard` is reachable without bouncing to `/login`.

- **Open dashboard.** Choose `Dashboard` in `Main navigation`, or navigate to `{origin}/dashboard`. `Main navigation` has `aria-current="page"` on Dashboard. The page shows a greeting `Good morning`, `Good afternoon`, or `Good evening`, optionally followed by `, {firstName}`. Header includes `Search (Ctrl+K)` and `Sign out`.
- **Kit briefing.** The briefing names `Kit`. One of these is visible: an event message (severity label in text, not color alone), `All caught up. Nothing overdue or expiring right now.`, or `Nothing new, but you have set some things aside.` If the API failed, the property section alert is `Could not reach the server.` with `Retry` — that is not a Kit proof.
- **Overview or first run.** If the org has properties, a heading `Property management` is present. If not, the `Getting started` region heading is `Set up your portfolio` with steps `Add a property`, `Add floors & the plan`, `Map the units`.
- **New property.** Choose `New property` in the dashboard header actions (link to `/properties?create=1`). The properties page heading is `Properties` and a dialog heading `New property` appears. Close with `Cancel` unless the properties recipe is also being proven.
- **Onboard tenant.** Choose `Onboard tenant`. The tenants page heading is `Tenants`. An onboarding starts (wizard or in-progress card). Cancel that onboarding if this run created it and you are not proving tenants.
- **New bill.** Choose `New bill`. The bills page heading is `Bills` and a dialog heading `New bill` appears. Close with `Cancel` unless proving bills.
- **Proof.** Save `{evidence}/dashboard.aria.yml` and `{evidence}/dashboard.png` showing the greeting, `Kit`, `Main navigation`, and either `Property management` or `Set up your portfolio`.

## Gotchas

- Guest `/dashboard` redirects to `/login`. That is auth, not a dashboard failure.
- Kit's face is decorative (`aria-hidden`). Severity must appear as text (`Urgent`, etc.) or as the all-clear / set-aside copy.
- Quick actions strip `?create=1` after opening the dialog. Refresh will not reopen it.
- `Onboard tenant` starts a real onboarding on the server. Cancel it if you are only proving the dashboard link.
- Do not click `Sign out` to "reset" unless the recipe requires it and this run signed in.
