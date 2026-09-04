# ADR 0040 — admin-frontend owns a three-state theme and hands it to identity-service

Status: accepted (2026-09)

## Context

[ADR 0020](0020-actionable-authentication-feedback.md) decided that "React sends its current
`light` or `dark` theme as an OIDC extension parameter", so the credential page does not flash
the opposite theme. **That decision was never implemented on the React side.**
`features/auth/api/authClient.ts` constructs its `UserManager` with no `extraQueryParams`, and
the React app has no theme system at all: `src/app/globals.css` carries a
`@media (prefers-color-scheme: dark)` block and nothing else. There is no toggle, no
persistence, and no way for a user to choose.

Meanwhile the identity-service login page already implements the full behaviour in plain
JavaScript: `wwwroot/js/theme-init.js` reads `localStorage` key `admin-theme`, falls back to a
`data-theme` attribute and then to the OS preference, and sets `data-theme`, `color-scheme` and
the `theme-color` meta. So one half of a two-application contract exists and the other half
does not.

The product requirement is three states, not two: light, dark, and **automatic** — following
the operating system and reacting when it changes.

`next-themes` is the usual answer. It is built for Next.js: it carries server-side rendering
machinery this client-only Vite SPA has no use for, and it has open React 19 issues. The 2026
alternatives that address those issues are obscure single-maintainer forks.

The app already contains the exact pattern this needs. `shared/session/sessionStore.ts` is a
snapshot / subscribe / dispatch store read through `useSyncExternalStore`, with a pure reducer
beside it. A theme store is the same shape with a smaller state.

## Decision

**Three states, stored as the choice, not as the result.** `ThemeChoice` is
`'light' | 'dark' | 'system'`; the resolved theme is derived. Storing the resolved value would
make "automatic" unrepresentable and silently freeze the user's first OS state.

**Hand-rolled, in `shared/theme/`**, mirroring `shared/session/`: a pure `resolveTheme` function,
a store that subscribes to `matchMedia('(prefers-color-scheme: dark)')`, and a `useTheme` hook over
`useSyncExternalStore`. No dependency.

It lives in `shared/` rather than in a feature because `features/auth` must read the resolved
theme to send it to the identity-service, and `features → shared` is the only direction the
ESLint layer rules permit.

**The storage key is `admin-theme` and the attribute is `data-theme`** — byte-identical to what
`identity-service/wwwroot/js/theme-init.js` already uses. This is what makes the handoff work at
all, and it is why the Tailwind dark variant is defined as
`@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` rather than the
class-based default.

**A blocking inline script in `index.html`** applies the resolved theme before first paint. It is
a direct port of `theme-init.js`, with the same precedence: stored choice → attribute → OS.

**ADR 0020's gap is closed**: `signinRedirect()` passes `extraQueryParams: { theme }`, read at
call time from the store — not baked into the `UserManager` at construction, which would freeze
the theme at module load.

**The identity-service login stylesheet adopts the panel's brand hue** so the two applications do
not read as two products across the redirect.

## Consequences

- The two applications now share a contract that is not enforced by any type: the key name
  `admin-theme`, the attribute `data-theme`, and the two accepted values. Changing either side
  alone reintroduces the flash. This ADR is the record of that coupling.
- A choice made on the credential page persists on that origin and takes precedence there on
  later visits, per ADR 0020. The two origins therefore hold independent preferences that are
  synchronised only in the React → identity direction. This is accepted: the alternative is a
  cross-origin sync mechanism for a cosmetic setting.
- `theme-init.js` and the React inline script are two implementations of one algorithm, in two
  languages of the same language. They will drift if edited independently. The mitigation is that
  both are short and both are named here; there is no sync check, deliberately — a mechanical
  check that compares copies is the failure mode [ADR 0016](0016-ai-agent-governance-framework.md)
  documented.
- `prefers-color-scheme` is no longer consulted by CSS directly. Every token flips on
  `[data-theme]`, and the inline script is what translates the OS preference into that attribute.
  A CSS-only dark block would fight the toggle.
- Tokens must be declared for both themes at the token layer, never inside a component. A colour
  whose only definition sits in one theme's block renders one theme's text on the other theme's
  ground.
- `index.html` gains `lang="pt-BR"` (it was `en`, which mis-announces every string to a screen
  reader) and a `theme-color` meta the store keeps current.

## Alternatives considered

**`next-themes`.** The default answer, and it would work. Rejected because it brings SSR
machinery this app cannot use, has open React 19 issues, and would be a dependency doing what
the codebase's own existing store pattern does in about sixty lines — against a stated principle
of abstraction proportional to the problem.

**CSS `light-dark()` with `color-scheme`.** Removes the duplicated token block and is well
supported. Rejected because the manual toggle still needs to drive `color-scheme` from
JavaScript, so it removes neither the store nor the inline script — it only changes where the
colours are written, while making the two-application contract harder to read.

**Two states (light/dark) with the OS as the initial value only.** Simpler, and rejected outright:
"automatic" was an explicit product requirement, and an app that samples the OS once behaves
wrongly for anyone whose system switches on a schedule.
