# Late fees UI proof

- Feature file: `.cursor/skills/verify-leaseting/features/late-fees.md`
- Entry points: Settings hub card, then `/settings/late-fees`
- Origin: `http://127.0.0.1:4210` launched by `control-leaseting.mjs`. Authenticated drive used `http://localhost:4210` on that same process because the API cookie lives on `localhost:8000` and is same-site only from `localhost`, not `127.0.0.1`.
- Doctor: `ok: true`, `title: Leaseting`, `api.reachable: true` (401 without cookie). `credentialsPresent: false`; signed in through the form as seeded staff.

## What changed / observed

- Hub: heading `Settings`. Under Property Management, cards are Charge items → Late fees → Payment destinations. Late fees copy is `Charge a late fee on unpaid rent after a grace period.`
- Page: heading `Late fees`, breadcrumb includes Settings, form landmark `Late fees`. Toggle `Charge late fees`. With the toggle on: Grace, Fee (Fixed / % of balance), Post as.
- Save blocked: toggle on + `% of balance` at `0.00 %` left `Save` `disabled`. Did not save ON.
- Empty catalogue: skipped. Seeded `Late fee` charge item exists.
- Billing tools on `/bills`: SOA, Generate SOA, Utility run, Generate rent bills. No late-fee item.

## Artifacts

- `late-fees-hub.aria.yml` / `late-fees-hub.png`
- `late-fees-page.aria.yml` / `late-fees-page.png`

## Side effect

UI did not PATCH the rule. API GET after the drive is still `mode: OFF`.
