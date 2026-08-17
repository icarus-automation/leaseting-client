---
name: Leaseting
description: Keyboard-first property management operating system for Philippine property ops teams
colors:
  primary: "oklch(0.50 0.16 262)"
  primary-hover: "oklch(0.44 0.16 262)"
  primary-active: "oklch(0.38 0.15 262)"
  primary-foreground: "oklch(1.000 0.000 0)"
  background: "oklch(1.000 0.000 0)"
  surface: "oklch(0.975 0.005 262)"
  surface-hover: "oklch(0.965 0.006 262)"
  border: "oklch(0.880 0.006 262)"
  border-strong: "oklch(0.720 0.010 262)"
  heading: "oklch(0.14 0.008 262)"
  body: "oklch(0.14 0.008 262)"
  muted: "oklch(0.52 0.015 262)"
  success: "oklch(0.52 0.18 145)"
  muted-success: "oklch(0.92 0.05 145)"
  destructive: "oklch(0.54 0.22 15)"
  muted-destructive: "oklch(0.94 0.04 15)"
  warning: "oklch(0.72 0.15 68)"
  muted-warning: "oklch(0.95 0.04 68)"
  vacant: "oklch(0.55 0.13 230)"
  muted-vacant: "oklch(0.94 0.03 230)"
  ring: "oklch(0.50 0.16 262 / 0.35)"
  ring-destructive: "oklch(0.54 0.22 15 / 0.25)"
typography:
  display:
    fontFamily: "Poppins, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "normal"
  headline:
    fontFamily: "Poppins, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Poppins, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
  eyebrow:
    fontFamily: "Work Sans, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.055em"
rounded:
  xs: "2px"
  base: "4px"
  lg: "6px"
  full: "9999px"
spacing:
  page-gutter: "32px"
  page-gutter-compact: "16px"
  section-gap: "20px"
  field-gap: "12px"
  cell-x: "16px"
  cell-y: "12px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.body}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "0 10px"
    height: "32px"
  button-secondary-hover:
    backgroundColor: "{colors.surface}"
  button-icon-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.base}"
    height: "28px"
    width: "28px"
  status-badge:
    textColor: "{colors.body}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "3px 8px"
  card:
    backgroundColor: "{colors.background}"
    textColor: "{colors.body}"
    rounded: "{rounded.base}"
    padding: "14px"
  table-header-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.micro}"
    padding: "10px 16px"
  table-row:
    backgroundColor: "{colors.background}"
    textColor: "{colors.body}"
    padding: "12px 16px"
  table-row-hover:
    backgroundColor: "{colors.surface}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.base}"
    padding: "7px 10px"
  nav-item-active:
    textColor: "{colors.primary}"
  search-trigger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.base}"
    padding: "6px 12px"
    width: "220px"
---

# Design System: Leaseting

## Overview

**Creative North Star: "The Instrument With a Face"**

Leaseting is a professional ops instrument — the kind a property manager opens at 9am and doesn't close until end of day. Every surface is built for that shift: pure white ground so status signals never compete with decoration, hairline borders instead of shadows, 4px corners everywhere, and a single geometric type family that disappears into the data. Chrome recedes; the numbers are the interface. Nothing on screen is there to be admired.

And then there is Kit. In exactly three places — a dashboard card, a bottom-right badge, and the sign-in sheet — the instrument has a face: a drawn character who idles at 1.5°, hops three times when a payment is recorded, and slumps five degrees on bad news. This is not a lapse in the system's discipline; it is the one deliberate exception the discipline exists to protect. Kit is legible precisely because nothing else moves, and Kit is trustworthy precisely because his facts are templated and deterministic while only his commentary comes from a model. The severity is always readable as text. The face never carries meaning alone.

The system rejects Buildium and AppFolio's corporate-beige forms, generic SaaS template-land's icon-grid dashboards and gradient hero metrics, Airtable and Notion's database-block personal-project energy, and enterprise ERP's gray-on-gray 2008 density. Density is welcome here; airlessness is not. A manager fluent in Linear, Stripe, or GitHub should sit down and trust this interface inside a second — then be mildly, pleasantly surprised that something in the corner is watching out for them.

**Key Characteristics:**
- Light everywhere, no exceptions — pure white ground (`oklch(1.000 0.000 0)`), Panel Surface as the only other ground; UI color lives in the primary and status layers
- One hue family: everything neutral is tinted toward 262, so "gray" is never actually gray
- Flat at rest — depth is tonal layering and 1px hairlines; shadows only for genuinely floating layers
- 4px corners on everything except pills, which are fully round
- Two families, no third: Poppins for headings, Work Sans for everything else
- Status is a vocabulary, never a color — every tone ships with a label
- Motion confirms and then stops, at 150ms — with Kit as the one scoped, documented exception
- Keyboard-first: `Ctrl+K` palette, `outline`-based focus rings that never shift layout

## Colors

One indigo primary, a four-tone status vocabulary, and neutrals that are all quietly tinted toward the same hue (262). Nothing on screen is a true neutral, and nothing is colored for decoration.

### Primary

- **Ledger Indigo** (`oklch(0.50 0.16 262)`): The only interactive hue. Primary buttons, active nav item, focus rings and outlines, current stepper node, links on hover, Kit's own name label, and the user avatar. Its two darker steps (`primary-hover` `oklch(0.44 0.16 262)`, `primary-active` `oklch(0.38 0.15 262)`) are the pressed states, never separate colors. Active nav backgrounds are the same hue at 8% via `color-mix`, rising to 12% on hover — a tint, never a fill.

### Secondary

The status vocabulary. These four are not decorative accents; each one names a condition a property manager acts on. Every one ships in a saturated pair (dot, icon, text emphasis) and a muted pair (chip background).

- **Settled Green** (`oklch(0.52 0.18 145)` / muted `oklch(0.92 0.05 145)`): Paid, resolved, active-healthy, "all caught up."
- **Overdue Red** (`oklch(0.54 0.22 15)` / muted `oklch(0.94 0.04 15)`): Overdue bills, terminated leases, destructive actions, error banners, and the sign-out button's hover state.
- **Due Amber** (`oklch(0.72 0.15 68)` / muted `oklch(0.95 0.04 68)`): Expiring soon, coming up, cautionary. The bridge between healthy and alarming.
- **Available Azure** (`oklch(0.55 0.13 230)` / muted `oklch(0.94 0.03 230)`): Vacant units. Deliberately analogous to the primary rather than a fifth hue — a vacancy is an opportunity, not an alarm, and the azure stays visible on white floor plans where an unfilled shape would vanish.

### Neutral

- **Pure White** (`oklch(1.000 0.000 0)`): Page ground, cards, table rows, dialogs, the header bar. Literal pure white — no cream, no warmth, no tint.
- **Panel Surface** (`oklch(0.975 0.005 262)`): Sidebar, table headers, row hover, inset panels, dialog footers, kbd chips. The tonal step that separates chrome from content without drawing a line. `surface-hover` (`oklch(0.965 0.006 262)`) is its one deeper step.
- **Ink** (`oklch(0.14 0.008 262)`): Headings and body alike — a single text color, differentiated by weight and size rather than by shade. Near-black with a trace of the brand hue.
- **Muted Ink** (`oklch(0.52 0.015 262)`): Metadata, table headers, helper text, timestamps, inactive nav labels, placeholders.
- **Hairline** (`oklch(0.880 0.006 262)`): Every border in the system — cards, table rows, inputs, dividers, dialogs. **Border Strong** (`oklch(0.720 0.010 262)`) appears only where a control must announce it is hoverable, as on the search trigger.

### Tertiary

There is no third ground. The sign-in sheet — historically the one place tempted into a drenched panel — uses the same two neutrals as everything else, just inverted in emphasis: the sheet sits on **Panel Surface** and the form card steps up to **Pure White**, so the action is the brightest thing on screen. That single tonal step is the whole device. No wash, no gradient, no dark panel.

### Brand Artwork

- **Leaseting logo:** One official asset, everywhere: **`public/brand/leaseting-lockup-on-dark.png`** — deep navy artwork on transparency. The filename is misleading; it needs a *light* surface, which under the Light-Only Rule is every surface in the product. Sidebar brand row, compact header, sign-in masthead — all the same file.

  The green files in `public/brand/` (`leaseting-mark-green.png`, `leaseting-lockup-on-black.png`) are **legacy and slated for disposal or replacement**. Nothing references them; do not introduce a reference.

  It renders through `app-brand-logo`, which crops the artboard padding with measured ratios so `--brand-logo-height` means the height of the *visible artwork*, not the padded box. Never synthesize a backing, recolor, filter, or substitute. Never place product branding inside dashboard page content. The navy is embedded in the artwork and is the one non-semantic identity color: do not sample it into interface tokens.

### Named Rules

**The Semantic Monopoly Rule.** If a color appears in the interface, it means something. Ledger Indigo on interactive and active states only. Amber on cautionary status only. Red on error, overdue, terminated, and destructive only. Green on resolved and healthy only. Azure on vacancy only. The sole exception is the fixed green embedded in the canonical Leaseting logo artwork; it identifies the product and never communicates application state. Any other decorative use is wrong. Test: remove the color — if neither meaning nor brand identity breaks, it should not have been there.

**The Logo Asset Rule.** One asset — `public/brand/leaseting-lockup-on-dark.png` — rendered directly at its native aspect ratio with only ordinary sizing. No generated backing, CSS filter, recolor, blend mode, or substitute. A plate behind the lockup is always the wrong answer: the artwork is navy and every surface is light, so it is legible unaided. Branding belongs to persistent application chrome and the sign-in sheet, never inside dashboard page content.

**The Light-Only Rule.** *Binding, no exceptions, including pre-authentication.* This product is light. There is no dark theme, no dark mode toggle, no drenched dark panel, no "just the sign-in screen" carve-out — a dark surface anywhere is a defect, not a variant. Every ground is Pure White or Panel Surface; depth comes from that one tonal step plus hairlines. Anything a proposal calls a hero, a threshold, or a moment still renders light. This rule also fixes the logo question permanently: the canonical artwork is deep navy, so a light ground is the only ground it can sit on, and a plate behind it can never be needed.

**The Pure Surface Rule.** Page backgrounds are `oklch(1.000 0.000 0)`, with **Panel Surface** as the one sanctioned alternative where a page is composed *around* a card rather than filled with data — the sign-in sheet is the only such page today. No warmth, no linen, no tint. Cream grounds hide contrast failures and read as generated regardless of intent. The brand hue belongs to the primary and status layers, not the surface.

**The Label-Always Rule.** A status color never travels alone. Every tone is accompanied by a text label or a shaped icon in the same element — the status chip pairs a dot with a word, Kit's severity always renders as words even when the icon is the only thing visible at small widths, and overdue dates carry a weight change alongside the red. Color is reinforcement, never the signal.

**The One Neutral Hue Rule.** Every neutral in the system is tinted toward hue 262 at low chroma. Introducing a true `#808080`-family gray, or a neutral tinted toward a different hue, breaks the family resemblance that makes the palette read as designed rather than assembled.

## Typography

**Heading Font:** Poppins (500 / 600 / 700), with `sans-serif` fallback
**Body Font:** Work Sans (400 / 500 / 600), with `sans-serif` fallback

**Character:** A geometric pairing with almost no contrast between the two — Poppins is rounder and more constructed, Work Sans is more open and reads better at 12–14px in dense rows. The distinction is felt rather than seen. Neither family is expressive, and that is the point: the type is a delivery mechanism for numbers and names, and the moment a reader notices the typeface, the type has failed. Both are already loaded globally; do not import a third family.

### Hierarchy

- **Display** (Poppins 600, 24px, line-height 1.2): Page titles. One per screen. Fixed size, not fluid — product UIs are viewed at consistent DPI and a clamp would only add jitter.
- **Headline** (Poppins 600, 18px, line-height 1.25): Dialog headings, major section titles.
- **Title** (Poppins 600, 15px, line-height 1.3): Card headers, empty-state headlines, panel titles, the sidebar brand name.
- **Body** (Work Sans 400, 14px, line-height 1.6): Default text everywhere, set globally on `body`. Prose caps at ~70ch; empty-state descriptions cap at 42ch.
- **Label** (Work Sans 500, 13px, line-height 1.4): Form labels, buttons, nav items, primary table cell text. The workhorse size.
- **Micro** (Work Sans 500, 12.5px, line-height 1.4): Table column headers, secondary row metadata, field errors, chip text, timestamps.
- **Eyebrow** (Work Sans 600, 10.5px, letter-spacing 0.055em, uppercase): Sidebar section labels and the dashboard date line only. The single sanctioned uppercase treatment in the system.

### Named Rules

**The Scale Ratio Rule.** Adjacent steps sit at roughly 1.15–1.2. A dashboard holds more simultaneous type roles than a marketing page, and exaggerated size contrast reads as noise rather than hierarchy. When two levels feel too close, the fix is weight or color — never a bigger jump in size.

**The No-Display-in-Data Rule.** Display and Headline sizes are forbidden inside tables, form inputs, and inline labels. Data is information, not announcement. A table cell in semibold 24px is a design error, and so is a metric rendered at hero scale because it felt important.

**The Threshold Exception.** The sign-in sheet is the one surface outside the ramp: its claim runs 27px on phones, 30px on tablets, 40px on desktop, above Display's fixed 24px. It is pre-authentication, holds a single sentence, and is never viewed alongside data — the conditions the fixed ramp exists to protect do not apply. Nowhere else earns a size off the ramp.

**The Uppercase Containment Rule.** Uppercase with tracking is reserved for the Eyebrow role. It degrades badly below 11px and destroys the scanability of anything a user reads word-by-word, so it never appears on table headers, buttons, badges, or labels.

**The Tabular Numbers Rule.** Any figure that appears in a column — currency, counts, page ranges, meter readings — carries `tabular-nums`. Columns of proportional digits do not align, and a manager comparing amounts down a column is doing the thing this product exists for.

## Layout

**The shell.** A fixed `100dvh` CSS grid: a 240px sidebar column and a `1fr` main column, with the page itself never scrolling. The main column holds a 56px sticky header and a single scroll container (`.content-area`) at 32px padding. This is what makes the sidebar and header permanent without any sticky-positioning fragility — and it is why the print rules exist (see below).

**Density.** Comfortable, not compressed. Page sections stack at 20px. Table cells run 16px horizontal / 12px vertical, header cells 10px vertical. Form fields group at 6px between label and control, 12px between fields. The rule of thumb: rows can be tight, but the gutters around a data region are never negotiable.

**Responsive.** One structural breakpoint at **1024px**: below it the sidebar stops being a grid column and becomes a fixed drawer that slides in over the content at 200ms, behind a 40% ink scrim, with `visibility` animated alongside the transform so offscreen links are not tab stops. Content padding drops to 16px. A second breakpoint at **640px** handles phone chrome: the header loses its search placeholder and keyboard hint (there is no physical keyboard to press `Ctrl+K` on), the user's name gives way to the avatar that already carries their initials, and the stepper collapses from a vertical rail to a row of progress bars.

**The sign-in sheet** is the one page outside the shell, so it carries its own structure: a Panel Surface ground with a centred document that runs `max-w-30rem` as a single column and opens to `max-w-69rem` at **1024px**, where it splits into a `1fr` brief column and a `23.5rem` form column. The form card is first in the DOM and grid-placed to the right, so keyboard and screen-reader users reach the task before the brief while desktop still reads brief-then-form. Below 1024px the single column stacks masthead → form → brief, action first. Masthead rule above, foot rule below; at 1440×900 the whole sheet fits without scrolling.

**Bottom clearance.** Kit's badge owns the bottom-right corner permanently. The scroll container reserves `scroll-padding-bottom: 5rem` and the mobile content area adds 5.5rem of bottom padding, so the last table row is never trapped underneath him. Toasts are lifted to 5.5rem for the same reason.

**Print.** Reports are printed and saved-to-PDF straight from the page — there is no separate export renderer to drift out of sync. That only works because the print stylesheet unwinds the shell: the fixed grid becomes block flow, every scroll container goes visible, sidebar / header / Kit badge / scrim / toasts are hidden outright, `thead` repeats per sheet, rows avoid breaking, and borders drop to a hairline gray that survives printer color management. Individual toolbars and filter bars opt out with Tailwind's `print:hidden` — a control that cannot be clicked on paper is noise.

### Named Rules

**The Print Is The Export Rule.** What a manager sees on screen is what comes out of the printer. Any new report surface must survive `@media print` — if a region needs its own scroll container, it must release it in print, and any control that cannot be operated on paper must carry `print:hidden`.

## Elevation & Depth

Flat by default, and structurally so. A card is separated from the page by a 1px hairline; a sidebar is separated by a tonal step to Panel Surface; a table header is separated by tone plus a bottom border. None of them carry a shadow. Depth in this system means *layer position*, not visual richness — which is why exactly two shadows exist and both are attached to things that genuinely float above the document.

### Shadow Vocabulary

- **Lifted** (`box-shadow: 0 2px 8px oklch(0.14 0.008 262 / 0.10)`): Kit's badge panel, dropdowns, popovers, tooltips. Reads as "above the content," nothing more.
- **Modal** (`box-shadow: 0 8px 32px oklch(0.14 0.008 262 / 0.18)`): The command palette and dialogs. The heavier weight is doing a job — it signals full-attention capture and pairs with a backdrop.

Layer order is a token scale, not ad-hoc numbers: dropdown 1000 · sticky 1100 · modal-backdrop 1200 · modal 1300 · overlay 1350 · toast 1400 · tooltip 1500. PrimeNG 21.2 skips its overlay z-index lifecycle, so masks, select panels, datepickers and toasts are pinned to these tokens in `styles.css`; if PrimeNG resumes assigning inline z-indexes, those win.

### Named Rules

**The Flat-By-Default Rule.** Cards, panels, table rows, and inputs are flat at rest. Separation comes from a hairline or a tonal step — never a drop shadow. A shadow is a response to elevation state (floating, capturing focus), and a decorative shadow on a static element is prohibited.

**The Outline-Not-Border Rule.** Focus is drawn with `outline: 2px solid var(--primary)` at a 1–2px offset, never by swapping a border color or width. An outline does not participate in layout, so focus can never nudge a row or reflow a toolbar. Every interactive element in this system has a visible `:focus-visible` treatment; shipping without one is shipping broken UI.

## Shapes

**4px, everywhere.** Buttons, inputs, cards, dialogs, dropdowns, nav items, the brand mark, the skip link, image dropzones — all `var(--radius)`. The PrimeNG preset is overridden end-to-end to enforce it: `sm`, `md`, and `lg` all resolve to 4px, `xl` and `2xl` to 6px, so no third-party component can quietly introduce a softer corner.

Two sanctioned exceptions. **Fully round** (`9999px`) for things that are conceptually pills or dots: status chips, the "also waiting" links, the user avatar, Kit's badge trigger, the count bubble, stepper nodes, skeleton chips, and the mobile progress bars. **2px** for small internal rectangles — skeleton lines, kbd keycaps, inline focus targets — where 4px on a 12px-tall element reads as a lozenge.

Borders are always exactly 1px. There is no 2px border, no colored left-stripe accent, and no border used to convey status; tinted borders exist only as `color-mix` of a status hue into the hairline at 28–35%, and only on the chip or banner that already carries the label.

### Named Rules

**The Tight Radius Rule.** 4px on every component, pills fully round, 2px for sub-16px internals. Nothing else. This product has precise edges, not soft ones — a 12px or 16px radius anywhere reads as a different product, and `32px+` is prohibited outright.

## Components

Buttons, inputs, cards, and rows should feel **quiet, exact, and unhesitating**: nothing announces itself, every edge is deliberate, and every state change lands immediately with no flourish. Transitions are `150ms ease-out` and animate color only — never size, never position, never shadow. Every interactive component carries `motion-reduce:transition-none`.

### Buttons

- **Shape:** 4px corners (`var(--radius)`), no border on primary, 1px hairline on secondary.
- **Primary:** Ledger Indigo fill, white label, 36px tall, 14px horizontal padding, Label type at semibold. Hover steps to `primary-hover`, active to `primary-active` — a darker shade, never a shadow or a lift.
- **Secondary:** White fill, hairline border, ink label, 32px tall, 10px horizontal padding, Label type at medium. Hover fills to Panel Surface via `enabled:hover:` so a disabled control never previews a state it cannot enter. Disabled is `opacity-45` plus `cursor-not-allowed`.
- **Icon ghost:** 28px square, transparent, muted icon at 12–14px, hover fills Panel Surface and darkens the icon to ink. Used for dialog close, dismiss, and inline clear affordances. Always carries an `aria-label` naming the specific target ("Dismiss: rent overdue for Unit 4B"), never a bare "Close."
- **Segmented toggle:** A hairline-bordered group at 2px internal padding; the selected segment takes the Ledger Indigo fill with white text at a 3px radius, unselected segments are muted text on transparent. `aria-pressed` carries the state.

### Chips

- **Status badge:** Fully round, hairline border tinted with the status hue at 28–35% via `color-mix`, muted status fill, 8px horizontal / 3px vertical padding, Micro type. Contains a 6px dot in the saturated status color, then the label as text, then an optional count in semibold ink with `tabular-nums`. The dot is `aria-hidden`; the label is the accessible content.
- **Filter chip:** Same pill geometry on Panel Surface with a primary-tinted border, carrying its own inline clear button.

### Cards / Containers

- **Corner:** 4px. **Background:** Pure White. **Border:** 1px hairline. **Shadow:** none at rest.
- **Internal padding:** 14px for content cards, 16px for panels, 12px for compact insets.
- Section panels that need to recede — inset form groups, meter-reading blocks — swap the white ground for Panel Surface and keep the same hairline.

### Data Tables

The primary display surface of the product, and the one place density is allowed to win.

- Wrapped in a 4px, hairline-bordered, `overflow-x-auto` container so the table scrolls inside its frame rather than the page.
- **Header row:** Panel Surface ground, bottom hairline, Micro type in muted ink, sentence case, `scope="col"`. An actions column carries an `sr-only` label rather than an empty header.
- **Body rows:** White, separated by hairlines with `last:border-b-0`, 16px / 12px cell padding, hover fills Panel Surface at 150ms.
- **Cell hierarchy:** the identifying cell stacks a 13.5px medium ink link over a 12px muted secondary line ("Unit 4B · Sunrise Residences"). Currency is 13px medium ink with `tabular-nums`. A date that has gone overdue shifts to medium weight in Overdue Red — weight *and* color, per the Label-Always Rule.
- Freshly created or updated rows flash with `animate-row-flash`: the primary hue at 16% fading to transparent over 1.8s. It says "your row is here," then gets out of the way.

### Inputs / Fields

- Fields stack at 6px: a 13px medium ink `<label>` bound by `for`/`inputId`, the control, then the error.
- PrimeNG owns the control chrome (`p-select`, `p-datepicker`, `p-inputnumber`) via `AppPreset`; the radius override guarantees 4px. Do not restyle PrimeNG controls inline — extend the preset's semantic block instead.
- **Focus:** the global `:focus-visible` outline, 2px Ledger Indigo at 2px offset.
- **Composite fields** (a bare `<input>` inside a bordered box with a leading icon, as on sign-in) draw that same outline on the **wrapper** via `focus-within`, and the input's own outline is suppressed by an unlayered rule. One indicator, on the box the user perceives as the control. Two cascade traps make this non-obvious, and both bite anywhere in the app: Angular ships component styles *unlayered*, so a `:host` declaration silently beats any Tailwind utility on the host, and Tailwind's `outline-none` sits in `@layer utilities`, so it loses to the unlayered global `:focus-visible`.
- **Error:** a 12.5px Overdue Red message below the field. When a field is invalid, *every* cue goes destructive together — border, leading icon, focus outline, message — so a focused invalid field never shows an indigo indicator over a red border. Error banners use the muted-destructive ground with a 28% tinted border, an `exclamation-circle` icon, `role="alert"`, and a Retry affordance when the failure is recoverable.
- **Submitting:** a primary button whose `disabled` only ever means "request in flight" darkens to `primary-active` rather than fading. An opacity dim drops the status label ("Signing in…") to roughly 2.5:1, and that label is state the user must read, not an inactive control the contrast rules exempt. The spinner and `cursor-not-allowed` carry the not-clickable cue.
- Checkboxes use `accent-primary` at 15px inside a clickable label.

### Navigation

- **Sidebar:** 240px, Panel Surface ground, right hairline, `100dvh` sticky. Its header-height brand row directly renders the full transparent Leaseting lockup, centered and without a generated backing. Sections carry Eyebrow labels; "Connected Apps" is separated by a top hairline. External items append a 11px `external-link` glyph at 45% opacity and name their destination in the `aria-label`.
- **Nav item:** 7px / 10px padding, 4px radius, 13.5px medium, muted ink, 16px icon at 80% opacity. Hover tints the ground with ink at 5%. **Active** takes primary at 8% with a Ledger Indigo label and a full-opacity icon, plus `aria-current="page"` — a tint and a color change, never a left stripe.
- **Header:** 56px, white, bottom hairline, sticky at z-1100. Holds the skip link (offscreen until focused), the drawer toggle and compact Leaseting identity below 1024px, the search trigger, and the user cluster. The sign-out button is the one control whose hover goes red.
- **Search trigger:** Panel Surface, hairline, 4px, 220px minimum, muted placeholder plus a `Ctrl` / `K` keycap pair. Hover raises the border to Border Strong. It carries `aria-keyshortcuts="Control+K"` and collapses to an icon-only button on phones.

### Command Palette

The keyboard-first promise made visible. A 560px sheet at 14vh with the Modal shadow, entering on `animate-pop-in` (200ms, 0.98 scale and −4px). A 48px search row with a borderless transparent input and an `Esc` keycap; a `role="listbox"` of results with muted group headers, 14px leading icons, muted right-aligned hints, and an `arrow-right` glyph on the active row; a Panel Surface footer spelling out ↑↓ navigate · ↵ open · Ctrl K toggle. Focus is trapped with `cdkTrapFocus`, the active option is wired through `aria-activedescendant`, and the empty state names what can be searched rather than saying "no results."

### Kit

The only places the system permits a face and sustained motion — and the rules that keep it from becoming Clippy are part of the design, not a caveat.

- **Dashboard card:** a 7–8rem stage on Panel Surface carrying the office backdrop image, with the live sprite composited on top so mood can change independently of the scene. Beside it, a speech bubble — an ordinary hairline card with one corner rotated 45° into a notch — pinned so the notch lands level with Kit's head. The bubble names him in Ledger Indigo (the only thing that attributes the character), shows the severity chip, the templated message as a link to the entity, the optional model-written flavor line in muted ink, and an "Also waiting" pill row behind a top hairline.
- **Badge:** a 3.25rem round trigger anchored bottom-right at z-1000, with a count bubble and a panel that lists events and ends with a "Talk to Kit" link — the badge carries reminders; a real conversation gets its own page.
- **Sign-in sheet:** the third and last sanctioned place, where Kit introduces what the product does before anyone is authenticated. He stands directly on the Panel Surface sheet at 2.5–3.25rem wide with no stage — the dashboard frames him because it drops him into a dense page of data; the sign-in sheet is quiet enough that a border would only add a box. Beside him, the same notched white bubble on a hairline, naming him in Ledger Indigo. Mood is `neutral` — at rest and watching, because no event has been computed. The example rows he introduces are labelled **Example**: nobody is signed in, so they must never be readable as the visitor's own portfolio.
- **Motion:** `kit-idle` (6s, ±1.5° lean), `kit-hop` (780ms, capped at exactly 3 iterations, with anticipation squash and apex hold — the squash-and-stretch is what makes a flat PNG read as having weight), `kit-sulk` (400ms, 5° shoulders-down, then holds). All three pivot at `transform-origin: bottom center` so rotation reads as a body leaning rather than a sprite spinning.

### Named Rules

**The Kit Containment Rule.** Kit's animation is a scoped, deliberate exception to "motion confirms, never entertains." It is confined to his own card and badge, is hard-capped at three hop iterations, and never appears inside a table, a form, or a data view. Do not cite Kit as licence to animate anything else — perpetual motion in the corner of an all-day screen is precisely how Clippy earned its reputation.

**The Degrade-To-Facts Rule.** Kit's templated message is the deliverable and always stands alone; the model-written flavor line is an additive second paragraph in muted ink that simply does not render when it is absent. Never make a layout depend on the flavor being there, never let it carry information the message lacks, and never let a mood or a color be the only expression of severity.

## Do's and Don'ts

### Do:

- **Do** keep branding in persistent application chrome and render the exact supplied transparent lockup directly in the sidebar brand row and sign-in panel.
- **Do** reserve Ledger Indigo for interactive and active states — primary buttons, active nav, focus rings, current step, link hover. Its rarity is its signal strength.
- **Do** keep every page ground `oklch(1.000 0.000 0)` and every neutral tinted toward hue 262 at low chroma.
- **Do** pair every status color with a text label or a shaped icon in the same element. Overdue gets red *and* a weight change; Kit's severity gets an icon *and* words.
- **Do** give every interactive element the full state set: default, hover, `focus-visible`, active, disabled — and gate hover behind `enabled:` so a disabled control never previews a state it cannot enter.
- **Do** draw focus with `outline` at a 2px offset, never by swapping a border, so focus never shifts layout.
- **Do** add `motion-reduce:transition-none` / `motion-reduce:animate-none` to anything that moves, on top of the global `prefers-reduced-motion` reset.
- **Do** apply `tabular-nums` to every figure that appears in a column.
- **Do** write empty states that teach: name what will appear, explain how it gets there, and offer the primary action inline. "No bills found — create rent or utility bills against an active lease" beats "Nothing here."
- **Do** ship the four load states for every data surface: skeleton, error banner with Retry, teaching empty state, and content.
- **Do** keep transitions at 150ms ease-out on color only. Entrances that need more character use `cubic-bezier(0.22, 1, 0.36, 1)` and stay under 420ms.
- **Do** name the specific target in every icon-button `aria-label` ("Dismiss: rent overdue for Unit 4B"), never a bare verb.
- **Do** verify new report surfaces under `@media print` and mark unusable controls `print:hidden`.

### Don't:

- **Don't** promote the logo's green into the interface palette or use it as a decorative accent; it remains isolated inside the canonical Leaseting artwork.
- **Don't** ship Buildium/AppFolio corporate-beige grounds, crowded toolbars, or 2010-era form chrome.
- **Don't** use the generic SaaS template vocabulary: icon-heading-text card grids, hero-metric dashboards with gradient big numbers, numbered eyebrows (01 / 02 / 03) on every panel.
- **Don't** borrow Airtable/Notion database-block aesthetics or emoji as UI decoration. Kit is the product's personality budget, and it is fully spent.
- **Don't** recreate enterprise ERP density: 11px body text, zero gutters, gray-on-gray rows. Rows may be tight; the air around a data region may not be removed.
- **Don't** use gradient text, glassmorphism, colored left-stripe accents, animated metric counters, or a shadow on a resting element.
- **Don't** introduce a radius other than 4px, full, or 2px-for-small-internals — and never `32px+`.
- **Don't** import a third font family or a new weight. Poppins and Work Sans are loaded; hierarchy comes from weight and size within them.
- **Don't** introduce a true gray or a neutral tinted toward a hue other than 262.
- **Don't** override PrimeNG component colors inline. Extend `app.preset.ts`'s semantic block so the change lands everywhere at once.
- **Don't** reach for a modal first. Exhaust inline editing, drawers, and progressive disclosure before blocking the surface — and when a dialog is right, route every close path through a dirty-check.
- **Don't** animate anything in a table, a form, or a data view beyond the 150ms color transition and the row flash. Kit is not a precedent.
- **Don't** let color be the only carrier of meaning, and don't let a model-written line carry information the templated message lacks.
- **Don't** introduce a dark surface anywhere, for any reason — no dark mode, no drenched panel, no dark sign-in, no dark "moment". The Light-Only Rule has no exceptions.
- **Don't** put a plate, wash, or filter behind the lockup to make it legible; on a light ground it never needs one.
- **Don't** reference the legacy green brand files — they are being disposed of or replaced.
