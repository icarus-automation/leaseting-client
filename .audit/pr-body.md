## Why

Managers were reading cute report titles and long narrator blurbs. The client now uses the same short product words on every screen: lease, bill, SOA, unit, vacant, overdue, parking attendant, terminal, shift, void.

## Scope

- Report catalog and live report headers, including AR Aging, Revenue by Tenant, and Delinquency
- Dashboard, Properties, Tenants, Leases, Bills/SOA, Parking Overview, Settings parking cards, Kit, auth, Work Orders, Knowledge Base
- Sidebar Payment submissions, command palette labels
- `scripts/copy-check.mjs` plus `scripts/copy-glossary.json` as the regression gate
- Out of scope: parking-terminal, leaseting-api, routes, and behavior

## Tradeoffs

Old search synonyms stay in report keywords so a search for who owes still finds AR Aging. User-visible titles do not.

## Blast Radius

Anyone using the web client sees different labels. CSV headers for parking reports now say Terminal instead of Gate. No API or routing change.

## Verification

- `node scripts/copy-check.mjs`: clean
- `npx ng build`: succeeded (exit 0)
- Login page at http://127.0.0.1:4200/login: heading, Kit line, and example chips use overdue / vacant
- Authenticated screens were not driven in the browser. No session was available.
