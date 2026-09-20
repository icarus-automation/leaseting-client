# Leaseting verification map

This directory is the maintained source for verifying the user-facing behavior of the Leaseting staff web app. Read this index before driving, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs launch` so the UI is at `http://127.0.0.1:4210` (override only via `LEASETING_VERIFY_PORT` / `LEASETING_VERIFY_HOST`).
- Run `… control-leaseting.mjs doctor` and require `ok: true`, `title: "Leaseting"`, and `origin` matching the instance file.
- Never drive `http://localhost:4200` or any frontend this run did not start.
- Guest recipes (`sign-in` validation, forgot-password) do not need the API. Authenticated recipes need `doctor.api.reachable === true` and a staff session.
- Staff credentials, when required, come from `LEASETING_VERIFY_EMAIL` and `LEASETING_VERIFY_PASSWORD`. This frontend repo has no seed users.
- The API session cookie on `localhost:8000` is shared with every other Leaseting tab on the machine. Do not sign out a session this run did not create.
- Put `control-leaseting` evidence under the path printed by `evidence-dir --feature <id>`.

## Driving conventions

- Start every recipe from the baseline unless its preconditions say otherwise.
- Prefer ARIA roles, accessible names, and labeled inputs (`Email`, `Sign in`, `Main navigation`) over CSS or coordinates.
- Treat quoted names as literal.
- Browser actions go through the Cursor browser against `{origin}` from doctor. Launch/doctor/cleanup go through `control-leaseting.mjs`.
- After a mutation, confirm from a second user-facing view. Restore or archive fixtures this run created. Do not delete proof artifacts.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with Leaseting identity visible.
- Mutation proof includes a second read of the stored value (reload, list, or reopen).
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with Cursor browser` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Sign in](./sign-in.md) covers the guest sign-in page, validation, forgot-password stub, API-down and bad-credential alerts, and optional successful login.
- [Dashboard](./dashboard.md) covers the signed-in home, Kit briefing, and quick actions into create flows.
- [Properties](./properties.md) covers the portfolio list, create dialog, persistence, and opening a property.
- [Command palette](./command-palette.md) covers Ctrl+K / header search, navigation, create actions, and empty results.
- [Bills](./bills.md) covers the bills list, new-bill dialog, billing tools, and related money routes.
- [Late fees](./late-fees.md) covers Settings → Late fees, the four-field rule, and Save gating.
- [Organization](./organization.md) covers Settings → Organization, the live General card, and save-then-reload.
- [Work Orders](./work-orders.md) covers the maintenance request queue, request detail with photos, Start, and Resolve.

Unmapped but live (add files when a change lands there): Calendar, Ask Kit, Tenants / onboarding, Leases, Parking Overview, Knowledge Base, Reports, Settings (except Late fees and Organization).
