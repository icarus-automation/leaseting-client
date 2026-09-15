# Sign in

Sign in lets a staff member reach Leaseting with a workspace email and password, see precise errors when that fails, and read an honest message when self-service reset is not available.

## Sub-features

- `signin-open` shows the guest sign-in page with Leaseting identity and Kit's brief.
- `signin-validate` blocks an empty or malformed form without calling the server.
- `signin-forgot` opens the password-reset stub and returns to sign in.
- `signin-api-down` explains an unreachable backend.
- `signin-reject` explains incorrect credentials when the API is up.
- `signin-success` lands on the dashboard when env credentials are valid.

## How to get to it (user POV)

- Open `{origin}/login` while signed out.
- Open `{origin}/` or any authenticated path while signed out (guard sends the user to `/login`).
- Choose `Forgot password?` on the sign-in form.
- Choose `Back to sign in` on the reset page.

## Driving it with Cursor browser

Preconditions:

- Doctor reports `ok: true` for this run's origin.
- The Cursor browser is locked on that origin.
- For `signin-open` / `signin-validate` / `signin-forgot`: the session cookie must not already be signed in. If `{origin}/login` redirects to `/dashboard`, skip those IDs and record the shared-cookie precondition.
- For `signin-api-down`: doctor `api.reachable` is false.
- For `signin-reject` / `signin-success`: doctor `api.reachable` is true. Success also needs `LEASETING_VERIFY_EMAIL` and `LEASETING_VERIFY_PASSWORD`.

- **Open sign-in.** Navigate to `{origin}/login`. The heading is `Sign in`, the document title is `Leaseting`, the logo name is `Leaseting`, and Kit's name `Kit` is visible. Email is `#email`; password is `#password`; the submit control is named `Sign in`.
- **Empty submit.** Choose `Sign in` with both fields empty. `Email is required.` (`#email-error`) and `Password is required.` (`#password-error`) appear. The URL stays `/login`.
- **Invalid email.** Fill `#email` with `not-an-email` and choose `Sign in`. The email error is `Enter a valid email address.`
- **Forgot password.** Choose `Forgot password?`. The heading becomes `Reset your password` and the body includes `Self-service reset isn't available yet.` Choose `Back to sign in`. The heading is `Sign in` again.
- **API down.** With the backend stopped, fill a well-formed email and password and choose `Sign in`. An alert reads `Can't reach the server. Check your connection and try again.` Skip this ID if the API is up.
- **Rejected credentials.** With the API up, fill `#email` with a syntactically valid address that is not a staff user (e.g. `verify-skill-miss@example.com`) and any password, then choose `Sign in`. An alert reads `Incorrect email or password.` Wait until `Signing in…` is gone. Do not use the real staff password here.
- **Successful sign-in.** Fill `#email` and `#password` from env and choose `Sign in`. After `Signing in…` clears, the URL is `/dashboard`, `Main navigation` is present, and the Kit greeting includes the user's first name. Skip if credentials are unset.
- **Proof.** Save `{evidence}/signin-form.aria.yml` and `{evidence}/signin-form.png` on the guest `Sign in` page (identity + Kit + form). For success, also save `{evidence}/signin-dashboard.aria.yml` and `{evidence}/signin-dashboard.png` showing the greeting and `Main navigation`.

## Gotchas

- A leftover API cookie from `localhost:4200` sends `/login` straight to `/dashboard`. That is not proof of the guest page.
- `Keep me signed in` is UI-only and is not sent to the API. Do not treat it as persistence proof.
- Client validation never shows `Incorrect email or password.` That string is only for HTTP 401/403/422.
- Rate limit 429 shows `Too many attempts. Wait a moment, then try again.` Back off; do not hammer sign-in.
- An account that belongs to another Leaseting app shows a dedicated-app message instead of a generic failure. Record the exact alert text.
- Do not sign out after success unless this run created the session and the recipe requires a logged-out follow-up.
- Fill Angular fields with `browser_type` (input events). A silent value set can leave the reactive form empty while the DOM looks filled.
- `browser_take_screenshot` may write under the Cursor temp screenshots directory even when `filename` is a repo-relative path. Copy the PNG into the evidence folder before cleanup.
