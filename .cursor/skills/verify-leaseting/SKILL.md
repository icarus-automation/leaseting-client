---
name: verify-leaseting
description: Drive the Leaseting staff web app (Angular UI on the verify origin) the way a property manager would. Use when proving a UI change, checking login/dashboard/properties/bills/palette behavior in a real browser, or capturing screenshots and ARIA snapshots as evidence.
---

# Verify Leaseting

Leaseting is the Angular staff web app in this repo. A user touches the browser UI at the verify origin (default `http://127.0.0.1:4210`). Cookie-session auth and all domain data come from a **separate** backend at `http://localhost:8000/api/v1` (Better Auth). This checkout does not start that API.

There is no Playwright/Cypress harness. Drive the UI with the Cursor browser (CDP) using accessible names, labeled inputs, and routes from the feature map. Use `control-leaseting.mjs` only for launch, doctor, evidence folders, and cleanup.

Read `features/README.md` before driving. Prove the mapped entry points for the feature under test; do not treat a convenient shortcut as coverage for the others.

## Launch

Default verify bind is **`127.0.0.1:4210`**, not the README's `localhost:4200`. That keeps this run off a developer's existing `ng serve`.

From the repo root:

```bash
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs launch
```

Ready when the command prints JSON with `"status": "started"` or `"already-running"` and `origin` is `http://127.0.0.1:4210`. The helper waits until `GET {origin}` returns HTML whose `<title>` is `Leaseting` (first compile can take a few minutes; the wait is 300s). Logs: `.cursor/skills/verify-leaseting/.run/ng-serve.log`. Do not set `CI=1` for this serve — it disables the Angular cache and makes compile too slow for the wait.

Env:

- `LEASETING_VERIFY_PORT` — default `4210`. If that port is taken by a PID this run did not record, launch **refuses**. Do not steal `:4200`.
- `LEASETING_VERIFY_HOST` — default `127.0.0.1`.
- `LEASETING_VERIFY_EMAIL` / `LEASETING_VERIFY_PASSWORD` — staff login for authenticated features. Never print the password.

If `node_modules/@angular/cli` is missing, launch runs `npm install` in the repo root first.

Teardown is `cleanup` (below). Do not `taskkill` by image name (`node.exe`, `ng`).

## Doctor

Run this first whenever anything looks off, and once after launch before driving:

```bash
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs doctor
```

Exit `0` means this run's frontend is worth driving: `instance.json` exists, the recorded PID is alive, **that PID (or its recorded listen PID) owns the verify port**, and `{origin}` serves `<title>Leaseting</title>`.

The JSON also reports:

- `api.reachable` — `GET http://localhost:8000/api/v1/users/me` from Node (no cookie). `401`/`403` means the API is up. Status `0` means the API is down: guest UI can still be proven; authenticated features cannot.
- `credentialsPresent` — both env vars set. Does not validate them.
- `cookieWarning` — see Isolate.

If doctor fails, stop. Do not fall back to `http://localhost:4200` or any instance this run did not start.

`origin` helper:

```bash
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs origin
```

## Drive

Harness: Cursor browser MCP (`browser_navigate`, `browser_lock`, `browser_snapshot`, click/type/fill, `browser_take_screenshot`). Prefer roles, accessible names, `for=`/`id=` labels, and paths below. Do not use click coordinates unless a control has no accessible name (note that in Gotchas).

Lock the tab after navigate; unlock only when the whole drive (including screenshots) is done.

### Identity and chrome

- Document title: `Leaseting`.
- Sign-in shell (unauthenticated): heading `Sign in`, copy `Use your Leaseting workspace account.`, logo alt `Leaseting`, Kit attribution `Kit`.
- App shell (authenticated): `navigation` named `Main navigation` (`aria-label` on `#app-nav`). Brand link `Leaseting dashboard`. Header search button `Search (Ctrl+K)`. Sign-out button `Sign out`.
- Main landmark: `main#main-content`. Skip link `Skip to main content`.

### Routes (authenticated unless noted)

| Path | User-visible heading / landmark |
| --- | --- |
| `/login` | `Sign in` (guest only; signed-in users are sent to `/dashboard`) |
| `/login/forgot-password` | `Reset your password` |
| `/dashboard` | Kit greeting `Good morning/afternoon/evening, {firstName}` plus `Property management` |
| `/calendar` | `Calendar` |
| `/kit` | `Ask Kit` |
| `/properties` | `Properties` |
| `/properties/:id` | property name; breadcrumb nav `Breadcrumb` |
| `/tenants` | `Tenants` |
| `/tenants/onboarding/:id` | move-in wizard |
| `/leases` | `Leases` |
| `/bills` | `Bills` |
| `/bills/soa` | `Statements of Account` |
| `/bills/utility-run` | `Utility billing run` |
| `/bills/submissions` | `Payment submissions` |
| `/work-orders` | `Work Orders` (maintenance request queue) |
| `/parking` | `Parking Overview` |
| `/knowledge-base` | `Knowledge Base` |
| `/knowledge-base/utility-billing` | published KB article |
| `/reports` | `Reports` |
| `/settings` | `Settings` |
| `/settings/late-fees` | `Late fees` |
| unknown | `Page not found` |

### Sidebar labels (exact)

Today: `Dashboard`, `Calendar`, `Ask Kit`. Portfolio: `Properties`, `Tenants`, `Leases`. Money: `Bills`, `Payment submissions`. Operations: `Work Orders`, `Parking Overview`. Analytics: `Reports`, `Knowledge Base`. Footer: `Settings`. External: `Website CMS, opens in a new tab` — out of scope (other product).

While any maintenance request is Open, the Work Orders link also shows the count, and its accessible name becomes `Work Orders, {n} open`.

On narrow viewports the sidebar is a drawer: header button `Open navigation`, scrim `Close navigation`.

### Auth (real user path)

Sign-in `POST {api}/auth/sign-in/email` then org list + set-active, then `/users/me`. The browser holds an HTTP-only cookie; Angular stores nothing. `withCredentials` is required on API calls.

- Email: `#email`, label `Email`.
- Password: `#password`, label `Password`.
- Type into those fields (`browser_type`). Do not rely on a silent value set; Angular's reactive form can stay empty.
- Submit button name `Sign in` (in-flight: `Signing in…`, `aria-busy`).
- Client errors: `Email is required.`, `Password is required.`, `Enter a valid email address.`
- API down: alert `Can't reach the server. Check your connection and try again.`
- Bad credentials: alert `Incorrect email or password.`
- Show/hide: `Show password` / `Hide password`.
- `Forgot password?` → `/login/forgot-password` (honest stub: `Self-service reset isn't available yet.`, link `Back to sign in`).

Successful sign-in navigates to `/dashboard`. Do not call auth endpoints with curl as a substitute for this form.

### Session already present

`guestGuard` sends an existing cookie session from `/login` to `/dashboard`. If the first snapshot after `GET {origin}/login` is the dashboard, a **shared API cookie** is in play. Do not click `Sign out` unless this run created that session. Record the skip and drive authenticated features, or stop if the map required a logged-out start.

### Command palette

Header button `Search (Ctrl+K)` or Control+K. Dialog name `Command palette`. Searchbox `Search pages, actions, or tenants`. Listbox `Results`. Go-to items include `Dashboard`, `Properties`, `Bills`. Actions include `New property` (hint `Create`) → `/properties?create=1`.

### Mutations

Create/edit dialogs are `app-form-dialog` with an `h2` heading and footer `Cancel` plus the primary submit. Close is `aria-label="Close"` (Esc on a dirty form opens PrimeNG confirm). Archive/sign-out use `p-confirmdialog`: headers `Archive property` / `Sign out`, accept `Archive` / `Sign out`, reject `Cancel`.

Property create: heading `New property`, `#property-name` / `#property-address` / `#property-city`, submit `Create property`. Toast summary `Property created`. Empty list: `No properties yet`. Card link `{name}, open floor plans`.

Bill create: heading `New bill`, submit in the same dialog pattern. Header `New bill`; tools menu `Billing tools` → `SOA`, `Generate SOA`, `Utility run`, `Generate rent bills`.

Tenant create from palette/dashboard `?create=1` starts **onboarding**, not the old tenant dialog. Button on `/tenants` is `Start onboarding`.

Work Orders is a live queue. Start and Resolve are one-way mutations on the shared org; see [work-orders](features/work-orders.md).

## Evidence

Create a folder per run:

```bash
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs evidence-dir --feature sign-in
```

That prints an absolute path under `.cursor/skills/verify-leaseting/evidence/<timestamp>-<feature>/`. Put every artifact there. Cleanup must not delete this tree.

Required for a passing proof:

1. Real user path (form, nav link, palette, or typed URL a manager would use). No direct `AuthService` calls, no hitting `/auth/*` as a stand-in for the login page.
2. Capture **before and after** (or the action plus the resulting screen), not only the final frame.
3. UI: ARIA snapshot text (`browser_snapshot` saved as `*.aria.yml`) and a screenshot (`browser_take_screenshot` with `filename` named for the step). The Cursor tool may save the PNG under `%TEMP%\cursor\screenshots\` even when `filename` is repo-relative — **copy it into the evidence dir** before cleanup. The screenshot must show Leaseting identity (title, lockup, or `Sign in` / app heading).
4. Side effects: after a mutation, a **second** user-facing view (reload, list, or reopen). Toasts alone are not enough.
5. Write `PROOF.md` in that folder: feature file id, entry point used, origin, doctor JSON (redact secrets), what changed, and any skipped entry points with the unmet precondition.
6. Mocks: none in this app. The API is the production boundary. If it is down, prove only guest UI and say so.

Dry-run does not apply. `ng serve` is a live UI against the real API.

## Cleanup

```bash
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs cleanup
```

Kills only the PID tree written to `.cursor/skills/verify-leaseting/.run/instance.json` (`taskkill /PID /T` on Windows). Removes `instance.json`. Leaves `.run/ng-serve.log` and all of `evidence/`.

If launch failed part-way, still run cleanup.

## Isolate

- **Frontend:** one verify instance, default `:4210`. Never drive `:4200` unless this run's `instance.json` says that port. Two `ng serve` processes are fine on different ports; do not attach to the user's.
- **API + cookies:** not isolatable from this repo. `environment.ts` points at `http://localhost:8000/api/v1`. The session cookie lives on that API origin, so **localhost:4200 and 127.0.0.1:4210 share the same login**. Signing in or out from verification mutates the developer's session. Prefer guest-only recipes when `credentialsPresent` is false. When signing in, use the seeded staff account from env, not a guess. Do not sign out a foreign session.
- **Data:** properties, bills, and onboardings write to the shared backend. Use a clearly fake name (`Verify skill {timestamp}`) and archive or cancel it in fixture cleanup if the recipe created it. Do not archive real properties.

## Helpers

All invocations are from the repo root, via Node (Windows-safe):

```bash
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs launch
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs doctor
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs origin
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs evidence-dir --feature <feature-id>
node .cursor/skills/verify-leaseting/scripts/control-leaseting.mjs cleanup
```

`doctor` is the only health check. Do not invent a second one.

## Feature map

Index: [features/README.md](features/README.md)

Seeded: [sign-in](features/sign-in.md), [dashboard](features/dashboard.md), [properties](features/properties.md), [command-palette](features/command-palette.md), [bills](features/bills.md), [work-orders](features/work-orders.md).
