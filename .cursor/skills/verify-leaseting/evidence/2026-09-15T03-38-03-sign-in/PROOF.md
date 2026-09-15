# Sign-in proof (seed run for verify-leaseting)

- **Feature:** sign-in (`features/sign-in.md`)
- **Origin:** `http://127.0.0.1:4210`
- **Harness:** Cursor browser against this run's `ng serve`
- **When:** 2026-09-15

## Doctor (redacted)

```json
{
  "ok": true,
  "reason": "ok",
  "origin": "http://127.0.0.1:4210",
  "pid": 18108,
  "listenPid": 18108,
  "pidAlive": true,
  "portOwner": 18108,
  "title": "Leaseting",
  "api": {
    "reachable": false,
    "status": 0,
    "note": "API not reachable at http://localhost:8000/api/v1 (ECONNREFUSED). Authenticated features cannot be proven."
  },
  "credentialsPresent": false
}
```

## Entry points driven

| ID | Entry | Result |
| --- | --- | --- |
| `signin-open` | `{origin}/login` | Heading `Sign in`, title `Leaseting`, lockup visible, Kit brief on the shell. See `signin-form.png` / `signin-form.aria.yml`. |
| `signin-validate` | Submit empty form; type `not-an-email` | `Email is required.` + `Password is required.`; then `Enter a valid email address.` URL stayed `/login`. See `signin-validate-empty.png`, `signin-validate-email.png`. |
| `signin-forgot` | `Forgot password?` then `Back to sign in` | `/login/forgot-password`, heading `Reset your password`, copy `Self-service reset isn't available yet.` Return heading `Sign in`. See `signin-forgot.png` / `signin-forgot.aria.yml`. |
| `signin-api-down` | Submit `verify-skill@example.com` + a dummy password | In-flight `Signing in…` (`aria-busy`), then alert `Can't reach the server. Check your connection and try again.` URL stayed `/login`. See `signin-api-down.png`. The Cursor ARIA snapshot omitted `role=alert`; the screenshot and a DOM read captured it. |

## Skipped (precondition unmet)

- `signin-reject` — API not reachable (`ECONNREFUSED`).
- `signin-success` — API not reachable; `credentialsPresent` false.

Do not treat dashboard or any authenticated route as covered by this run.
