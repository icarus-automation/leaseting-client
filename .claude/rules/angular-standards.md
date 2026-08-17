You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

Your code must reflect production-grade practices used in enterprise applications.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Styling (Tailwind-first)

This project is **Tailwind-first**. Style in the template with Tailwind utility classes. A component `.css` file is the exception, not the default — reach for one only when a style is genuinely better expressed as CSS.

- Default to utilities for layout, spacing, color, typography, borders, radius, transitions, and state/responsive variants: `hover:`, `focus-visible:`, `focus-within:`, `group-focus-within:`, `active:`, `enabled:`, `disabled:`, `aria-*:`, `data-*:`, `motion-reduce:`, and arbitrary breakpoints like `min-[900px]:`.
- Use theme tokens as utilities (`bg-primary`, `text-body`, `border-border`, `rounded-base`, `font-heading`, `animate-*`…) per `theming.md`. When a shared value is missing, add it to the `@theme` block in `src/styles.css` so it becomes a utility — don't hardcode it in a component.
- Keep in CSS only what utilities express poorly, and put it in the right place:
  - Global/theme concerns → `src/styles.css`: `:root` variables, `@theme` mappings, fonts, resets, `@keyframes`, PrimeNG/third-party overrides.
  - Component `.css` (`styleUrl`) → reserved for the genuinely hard cases: multi-layer/complex gradients, elaborate keyframe choreography, or generated/third-party DOM you can't add classes to. Keep it minimal.
- Do NOT hand-write a component-length `.css` file of plain rules that map 1:1 to utilities — that's the anti-pattern this rule exists to prevent.
- `ngClass`/`ngStyle` stay banned (see Components). Apply conditional utilities with `[class.x]` bindings, a `[attr.data-*]` flag + a `data-[*]:` variant, or a computed class string.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## PrimeNG Usage (Modern + Controlled)

- Use **PrimeNG as a UI layer**, not as a logic layer
- Only import **required components** (avoid full bundle)
- Wrap complex PrimeNG components with **custom abstraction components** when needed
- Avoid tight coupling between business logic and PrimeNG APIs