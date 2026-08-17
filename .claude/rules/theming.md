You must follow the project theme. The source of truth is:

- `src/app/app.preset.ts` — PrimeNG `AppPreset` (primary palette, color scheme)
- `src/styles.css` — CSS variables + Tailwind `@theme` token mapping + fonts

## Colors

- Use Tailwind tokens from the `@theme` block in `src/styles.css`: `bg-primary`, `bg-primary-hover`, `text-primary-foreground`, `bg-secondary`, `text-body`, `text-heading`, `border-border`, `bg-background`, `bg-accent`, `bg-destructive`, `bg-muted-destructive`, `bg-success`, `bg-muted-success`, `ring-ring`, etc.
- Or use the underlying CSS vars directly: `var(--primary)`, `var(--text-body)`, `var(--border)`, etc.
- Raw Tailwind palette colors (`bg-blue-500`, `text-red-600`, etc.) are allowed, but whenever you use one outside the theme tokens, leave a brief inline note so devs reviewing can decide whether to promote it into the theme.
- NEVER hardcode hex colors in components or templates. Hex literals only belong in `app.preset.ts` and `styles.css`.
- For status UI use `destructive` / `muted-destructive` / `success` / `muted-success` tokens — do not invent new red/green shades.

## PrimeNG

- Rely on `AppPreset` semantic tokens — do not override PrimeNG component colors inline.
- If a new shade is needed, extend `app.preset.ts` (semantic block) rather than patching components.

## Typography

- Headings (`h1`–`h6`): `font-heading` (Poppins) — already applied globally in `styles.css`, do not re-import or override.
- Body, buttons, inputs: `font-body` (Work Sans) — already global.
- Do NOT import additional Google Fonts or font families.

## Radius & spacing

- Border radius: use `var(--radius)` or `rounded-base`. Avoid arbitrary `rounded-lg` / `rounded-xl` unless intentional.
- Spacing: Tailwind defaults are fine — no custom scale.
