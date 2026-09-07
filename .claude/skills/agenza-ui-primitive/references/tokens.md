# Tokens

The live values are in [`src/app/globals.css`](../../../../apps/admin-frontend/src/app/globals.css).
This file explains the **shape** so you know which layer to edit; it deliberately does not restate
the palette.

## Three layers, one direction

```
:root                    raw semantic variables, oklch          --background, --card, --primary…
[data-theme='dark']      overrides ONLY the ones that change    --background, --border…
@theme inline            maps Tailwind utilities onto them      --color-background: var(--background)
```

A component only ever names the **third** layer: `bg-background`, `text-card-foreground`,
`border-border`. It never reads `var(--background)` directly and never hardcodes a hue.

Adding a token means touching all three: declare it in `:root`, override it in the dark block **only
if it differs**, then map it in `@theme inline` — a variable with no `@theme inline` entry generates
no utility class and the component silently renders unstyled.

Brand is violet, hue 288, defined once as `--brand-*` and derived from there; the neutrals are the
same hue at very low chroma so surfaces sit in the brand family instead of reading as grey.

## Dark is an attribute, never a media query

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

The theme is **three-state** — light, dark, system — resolved by `shared/theme/` and written to
`data-theme` on `<html>`. `prefers-color-scheme` is an input to that resolution, not a styling hook.

**The failure:** a component that styles itself with `@media (prefers-color-scheme: dark)` goes dark
for a user who explicitly chose light on a dark-OS machine, and the rest of the page does not. Use
the `dark:` variant, which follows the attribute.

Same for the storage key and attribute name: `admin-theme` and `data-theme` are shared with
`identity-service`'s login page. Renaming either breaks the OIDC-redirect handoff (the credentials
screen opens in the opposite theme).

## Picking the right token

| You are painting | Reach for |
| --- | --- |
| Page ground | `bg-background` / `text-foreground` |
| A raised surface — card, popover, dialog | `bg-card` / `bg-popover` and their `-foreground` |
| Quiet text — helper, timestamp, placeholder | `text-muted-foreground` |
| A quiet fill — empty state, disabled row | `bg-muted` |
| Hover / selected state | `bg-accent` / `text-accent-foreground` |
| Any hairline | `border-border`; form control edges `border-input` |
| Brand emphasis, primary action | `bg-primary` / `text-primary-foreground` |
| Danger | `bg-destructive` / `text-destructive-foreground` |
| Focus | `ring-ring` (see below) |

`text-white` and `text-black` are wrong even when they look right — they are the token's job.

## Focus ring

Two-tone, to satisfy WCAG 2.2 focus appearance: a brand-coloured stroke plus an offset in the
surface colour, so the ring stays visible against a brand-coloured button **and** against the page.
A single-colour ring disappears on one of the two.

`outline: none` without a replacement indicator is a review blocker. Prefer `:focus-visible` so
pointer users do not get a ring on click, and let the Base UI part own focus behaviour rather than
hand-rolling it.

## Elevation in dark

In light, a shadow reads. In dark, a shadow is invisible — a black blur on a near-black surface.

So: **dark elevation is a luminosity step of the surface plus a 1px inset highlight along the top
edge**, not a `box-shadow`. A component that expresses depth only through `shadow-*` looks flat in
dark. Take the elevation utility from `globals.css` rather than inventing per-component shadows.

## Transitions on overlays

A component fetched fresh from the `base-nova` registry (`Dialog`, `Tooltip`, `DropdownMenu`) ships
with classes like `data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out
data-closed:fade-out-0`. These come from `tw-animate-css`, a package plan.md's D3 deliberately does
not add — without it the classes are silently inert and the overlay just snaps open/closed. `Sheet`
and `Toast`'s stock templates already avoid this: they use plain `transition` plus Base UI's own
`data-starting-style` / `data-ending-style` attributes (present on every Popup-style part —
confirmed on `MenuPopupDataAttributes` and `TooltipPopupDataAttributes`, not just Dialog's). Convert
the other three to match, rather than installing the missing package:

```tsx
// Before (stock, needs tw-animate-css to do anything)
className={cn(
  'fixed top-1/2 left-1/2 z-50 ... rounded-xl bg-popover p-4 ... duration-100 outline-none sm:max-w-sm ' +
  'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
  className,
)}

// After (zero dependency, matches Sheet/Toast)
className={cn(
  'fixed top-1/2 left-1/2 z-50 ... rounded-xl bg-popover p-4 ... outline-none transition sm:max-w-sm ' +
  'data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
  className,
)}
```

A closing dropdown that scrolls also needs `data-ending-style:overflow-hidden` (the stock
`data-closed:overflow-hidden` served the same purpose — prevents a scrollbar flash while the popup is
shrinking). If a future `npx shadcn add` regenerates one of these three files, the dead `animate-in`
classes come back — reapply this conversion rather than reaching for `tw-animate-css`.

## Backend-owned colours (FR-016)

Tag colours arrive as a hex from the API. **The value is not ours to change** — no lightening, no
clamping, no swapping for a nearest token. But the raw hex against an unknown surface is unreadable
in at least one theme.

Derive all three roles from it with `color-mix` against the **theme surface variable**, so the same
stored hex resolves differently in light and dark without anyone re-computing it:

```css
.tag {
  background-color: color-mix(in oklab, var(--tag) 12%, var(--card));
  border-color: color-mix(in oklab, var(--tag) 30%, var(--card));
  color: color-mix(in oklab, var(--tag) 65%, var(--card-foreground));
}
```

The hex enters as a custom property from the data, at the call site:

```tsx
<span className="tag" style={{ '--tag': tag.color } as React.CSSProperties}>
  {tag.name}
</span>
```

The cast is required: custom properties are not in `React.CSSProperties` under strict TypeScript.

Percentages live in `globals.css` — one class, tuned once. **Never** `style={{ backgroundColor:
tag.color }}`: that is the raw-hex path, and it fails contrast in one theme by construction.

## Density and motion

Touch targets rise to ≥44px under `@media (pointer: coarse)` — the coarse block in `globals.css`
already does this for the shared sizes, so a primitive that sets its own fixed height opts out of it.

`@media (prefers-reduced-motion: reduce)` disables transitions globally. There is no runtime
animation library (plan.md D3): CSS `transition`, `@starting-style`, and Base UI's `data-*` state
attributes are the whole toolkit.
