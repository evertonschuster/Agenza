# Theme tokens and dynamic colours

The values and shared styles live in
[`globals.css`](../../../../apps/admin-frontend/src/app/globals.css). Use semantic utilities such as
`bg-background`, `text-muted-foreground` and `border-border` in components.

## Add or change a token

Declare the semantic variable in `:root`, override it under `[data-theme='dark']` only when its value
differs, and map it in `@theme inline` if it needs a Tailwind utility. A CSS variable alone does not
generate a utility. Keep palette values and their tuning in the stylesheet.

## Follow the resolved theme

[`shared/theme/`](../../../../apps/admin-frontend/src/shared/theme/) resolves light, dark or system
and sets `data-theme` on `<html>`. Use the `dark:` attribute variant. Styling directly with
`prefers-color-scheme` would override an explicit light choice on a dark OS.

The `admin-theme` storage key and `data-theme` attribute also serve identity-service's login page.
Coordinate changes to that contract across the OIDC redirect.

Retain a visible focus indicator against both the control and its surrounding surface; the button's
ring and offset are a local example. Use the stylesheet's `elevate-1`/`elevate-2` utilities when a
surface needs elevation: their dark values include inset highlights that a dark shadow alone lacks.

## Overlay transitions

The app uses CSS transitions and Base UI's `data-starting-style`/`data-ending-style` attributes.
Generated `animate-in`, `fade-in-0` or `zoom-in-95` classes require `tw-animate-css`, which the app
does not include. Adapt generated classes to the existing pattern instead of adding that dependency:

```tsx
<TooltipContent className="transition data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0" />
```

For a scrolling popup, preserve `data-ending-style:overflow-hidden` to prevent a scrollbar flash
during closing. See the live
[`DropdownMenuContent`](../../../../apps/admin-frontend/src/shared/ui/dropdown-menu/components/dropdown-menu-content.tsx)
and [`TooltipContent`](../../../../apps/admin-frontend/src/shared/ui/tooltip/components/tooltip-content.tsx).
Respect the reduced-motion rule in `globals.css`; check touch targets when changing control sizes.

## Backend-owned colours

Keep a stored tag hex unchanged. Supply it as a custom property and let the shared `.tag` class mix
it with theme surface and foreground variables:

```tsx
<span className="tag" style={{ "--tag": tag.color } as CSSProperties}>
  {tag.name}
</span>
```

The `CSSProperties` type comes from React; the cast permits a custom property under strict typing.
The mix percentages belong only in `globals.css`. Avoid painting the raw hex directly onto an
unknown surface, and verify the resulting contrast in both themes when changing these styles.
