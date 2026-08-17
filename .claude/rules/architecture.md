This project uses a feature-based architecture. Place new code accordingly.

## Directory layout

```
src/app/
  core/           # cross-cutting singletons (auth, interceptors, guards, types)
  layout/         # app chrome: main-layout, header, sidebar
  modules/        # feature folders — see below
  shared/ui/      # reusable, feature-agnostic UI components
  app.routes.ts   # top-level lazy routes
  app.config.ts
  app.preset.ts
```

## Features (`src/app/modules/<feature>/`)

- Each feature owns its routes file: `<feature>.routes.ts`, lazy-loaded from `app.routes.ts`.
- Feature components live at the feature root or in subfolders.
- Sub-features nest the same pattern, e.g. `modules/crm/newsletter/subscribers/` — each level can have its own routes file.
- Feature-scoped services go in `modules/<feature>/services/` (see `modules/crm/services/crm.service.ts`, `modules/timekeeping/attendance/services/`).
- Existing features: `auth`, `crm` (with `leads`, `newsletter` → `subscribers`, `campaign`), `home`, `not-found`, `settings` (with `teams`), `tickets` (with `dashboard`, `categories`), `timekeeping` (with `attendance`).

## Core vs shared

- `core/` — singletons and app-wide concerns (auth service, guards, HTTP interceptors, global types). `providedIn: 'root'`.
- `shared/ui/` — presentational components reused across features. No business logic, no feature imports.
- If a service or component is only used by one feature, keep it inside that feature folder. Promote to `shared/ui` or `core` only when a second consumer appears.

## Layout

- New pages default to being rendered inside `MainLayout` (header + sidebar). Do NOT strip app chrome for "premium feel" pages unless the user explicitly asks.

## Routing

- All feature routes must be lazy-loaded via `loadChildren` from `app.routes.ts`.
- Keep route definitions inside the feature's own `<feature>.routes.ts`.

## File naming

- Follow existing convention: `<name>.ts`, `<name>.html`, `<name>.spec.ts` (no `.component` suffix).
- A `<name>.css` is **optional** — add one only when a component actually needs CSS that Tailwind expresses poorly. This project is Tailwind-first; most components carry no `.css` file (see `angular-standards.md` → Styling).
- Use external templates (and any `.css`) with relative paths (per `angular-standards.md`).
