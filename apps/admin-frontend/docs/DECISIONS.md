# Project Decisions Log

Decisions made during the initial build that agents should not relitigate
without explicit instruction from the project owner. Each entry has a
reason — if the reason no longer applies, the decision can be revisited.

---

## TypeScript configuration

### `erasableSyntaxOnly: true`

**Decision:** Keep the Vite 8 default.
**Reason:** Forces all classes to use explicit field declarations instead
of constructor parameter shorthand. This is more verbose but more
explicit — aligns with Clean Code principles. Applies project-wide
including use cases, repositories, and test helpers.
**Impact:** Every class constructor must declare fields explicitly and
assign in the body. No `constructor(private readonly x: T) {}`.

### `exactOptionalPropertyTypes: true`

**Decision:** Keep it despite the extra friction.
**Reason:** The domain models auth session data and tenant context where
"field absent" and "field explicitly undefined" are meaningfully different
states. Caught real bugs during the Auth build (Session optional fields,
User email/name assignment).
**Impact:** Optional field assignment requires conditional pattern:
`if (value !== undefined) { this.field = value }`. Never assign
`this.field = maybeUndefined` directly.

### `noUncheckedIndexedAccess: true`

**Decision:** Keep it.
**Reason:** Direct motivation: `oidcUser.profile['tenant_id']` resolves
to `unknown`, not `string`. The runtime guard `typeof x === 'string'` is
the only thing that's safe here — the compiler confirms this is necessary.

---

## Authentication

### OIDC library: `oidc-client-ts`

**Decision:** Use `oidc-client-ts` as the infrastructure-layer OIDC adapter.
**Reason:** Framework-agnostic (not React-specific), maintained standard
for Auth Code + PKCE flows, full TypeScript types.

### `automaticSilentRenew: false`

**Decision:** Disabled. Silent renewal is handled explicitly inside
`OidcAuthRepository.getCurrentSession()`.
**Reason:** Event-driven background renewal is invisible to callers —
they can't observe failure, can't trigger logout on failure, and can't
control timing. Explicit renewal inside `getCurrentSession()` gives the
application full control: try renewal, clear session on failure, return
`null` so callers redirect to login.

### `HandleAuthCallback` propagates errors unwrapped

**Decision:** `HandleAuthCallback.execute()` does not catch or wrap
errors from `authRepository.handleCallback()`.
**Reason:** At build time, the exact error shapes from `oidc-client-ts`
on various failure modes (expired code, denied consent, network error)
were unknown. Wrapping prematurely would discard information the
presentation layer might need to show different messages.
**Revisit when:** The IdentityServer backend exists and real error shapes
can be observed. At that point, consider a typed `AuthCallbackError`.

### `tenant_id` claim name

**Decision:** Use `tenant_id` as the claim name in IdentityServer tokens.
**Location:** Only referenced in `features/auth/infrastructure/oidcUserToSessionMapper.ts`.
**Revisit when:** A real token can be decoded and the actual claim name confirmed.

### `email` and `name` on `User` entity

**Decision:** Included as optional fields, marked as unverified assumptions.
**Reason:** Standard OIDC claims likely present, but actual IdentityServer
configuration not yet confirmed.
**Revisit when:** A real token is available — these may not exist, may be
named differently, or may require specific scopes.

---

## Application layer

### No server-state library (no TanStack Query, no SWR)

**Decision:** Use plain `useAsync` hook + repository calls.
**Reason:** Explicit project constraint from the brief. Most "state" here
is server data scoped by tenant — no complex shared client state.
`useAsync` provides the consistent loading/data/error pattern across all
feature hooks without the overhead of a full library.

### `useAsync` with `immediate` flag

**Decision:** `useAsync` accepts `{ immediate: boolean }` and defaults
to `true` (auto-run on mount).
**Reason:** Most uses are "fetch on mount and show the result." The
`immediate: false` option covers action-style calls (e.g. mutations)
that should only run on explicit user interaction.

### `react-hooks/set-state-in-effect` suppression in `useAsync` (no longer needed)

**Decision (superseded):** The `void execute()` call inside `useEffect` was
suppressed with an eslint-disable comment.
**Reason:** This was a documented false positive. The rule traced async
call graphs and flagged setState calls that happen after `await` — but
those calls are genuinely async and not synchronous within the effect.
React's own docs show the same pattern as recommended. See open issue
react/react#34743.
**Removed when:** `useAsync`'s internal state was consolidated from three
separate `useState` calls (`status`/`data`/`error`) into one
`useState<AsyncState<T>>` (the discriminated-union refactor - see
`AsyncState` in `useAsync.ts`). The rule no longer traces a violation
through the restructured `execute()`, and ESLint flags the disable comment
itself as unused. If this lint error reappears anywhere in the codebase,
treat it as a real violation before reaching for a suppression again.

---

## Infrastructure

### MSW `onUnhandledRequest: 'error'`

**Decision:** Any unhandled HTTP request in tests fails loudly.
**Reason:** Silent failures (hanging promises, undefined returns) are
worse than loud ones. If a repository makes a call without a registered
handler, we want to know immediately, not debug a flaky timeout.

### No real network calls in tests — ever

**Decision:** `oidc-client-ts`'s `UserManager` is mocked with a
hand-written fake in infrastructure tests, not with MSW (MSW intercepts
`fetch`, but `UserManager` does its own internal fetch management).
**Pattern:** Infrastructure tests for `OidcAuthRepository` use
`createFakeUserManager()` with `vi.fn()` methods.

---

## Presentation

### Context-based DI (not module-level singletons)

**Decision:** The `AppContainer` is built once via `useState(() => createAppContainer())`
in `AppProviders` and distributed via React context.
**Reason:** Singleton modules make testing harder (shared state between
tests). Context-based DI means each test can provide its own fake
container without module-level mocking.

### `ProtectedRoute` handles loading state explicitly

**Decision:** While `useAuth` status is `'loading'`, `ProtectedRoute`
renders a spinner — it does not redirect to `/login`.
**Reason:** Prevents a race condition where an authenticated user gets
briefly redirected to login before `getCurrentSession()` resolves.

### Design language

**Decision:** The stock shadcn/ui "Nova" theme with the `neutral` base
color, generated by `npx shadcn@latest init` and left unmodified — no
custom brand color, no custom shadows, no custom radius. `src/index.css`
holds only what the CLI wrote (plus the `@custom-variant dark` wiring
for `ThemeProvider`). See `agent-skills/agenza-frontend-feature/SKILL.md`
for the token table every page must use.
**Reason:** An earlier pass built a custom "soft/friendly SaaS" palette
(teal-600 brand accent, warm surfaces, hand-tuned shadows). The project
owner reviewed the result and asked for the opposite: adopt the
library's own default look as the system's identity, minimize custom
styling, and keep the codebase as simple as possible. Regenerating via
the CLI (rather than hand-picking colors) also guarantees the tokens
match what `npx shadcn@latest add <component>` will assume for any
future component.
**Impact:** Never hardcode a raw palette class (`bg-slate-50`,
`text-teal-700`, etc.) in a page — always use the semantic token
(`bg-background`, `text-primary`). Don't reintroduce a custom brand
color or shadow without an explicit request — the default look _is_ the
requirement, not a placeholder for one.
**Revisit when:** the project owner asks for a brand color again. Until
then, re-running `npx shadcn@latest init` should reproduce
`src/index.css` byte-for-byte (see ADR 005 for the exact command).

### UI component library: shadcn/ui

**Decision:** Build all interactive components (`Button`, `Card`,
`Input`, `Textarea`, `Label`, `Spinner`, …) from shadcn/ui — Radix UI
primitives copied into `src/components/ui/` via the shadcn CLI, styled
with Tailwind, not installed as an opaque npm dependency.
**Reason:** See `docs/adr/005-shadcn-ui-component-library.md` for the
full comparison against Mantine/Chakra/MUI/Ant Design. Short version: it
was the only option with zero competing styling system alongside
Tailwind, and copying source in means full ownership — no waiting on
upstream for a fix, no version-bump breakage.
**Impact:** Adding a new primitive is `npx shadcn@latest add <name> -c apps/admin-frontend`,
not `npm install`. Check the result against
`exactOptionalPropertyTypes: true` after generating — some registry
files need a fix (`dropdown-menu.tsx` didn't and was removed instead).
Keep generated files close to the registry output; only add a prop or
variant when a page genuinely needs it now, not speculatively.

### List pattern: `Table`, not stacked `Card`s

**Decision:** A page listing records (`TagsPage` today; `Services`,
`Clients`, etc. later) renders them in a `Table`
(`src/components/ui/table.tsx`), one row per record, actions in the
last column.
**Reason:** The project owner asked for "a lista estilo tabela" —
explicitly a table-style list — when the earlier stacked-`Card`-per-row
layout felt heavier than needed for records with a handful of fields
each.
**Impact:** `Table`'s own container already scrolls horizontally
(`data-slot="table-container"`, `overflow-x-auto`), which is what keeps
a wide table usable at 375px — don't add a second scroll wrapper around
it.

### Form pattern: always a `Dialog` modal

**Decision:** A create/edit form always opens in a `Dialog`
(`src/components/ui/dialog.tsx`) over the list. Never inline in the
page, never its own route.
**Reason:** The project owner chose this explicitly over a dedicated
page/route, for one consistent pattern across every feature vertical —
simpler to build and to maintain than deciding per-vertical.
**Impact:** The list stays mounted and visible behind the dialog (no
navigation, no lost scroll position). `TagsPage` is the reference: a
single `Dialog` instance whose content switches between create/edit
based on which record (if any) triggered it, rather than one dialog per
row.

### Destructive-action confirmation: `AlertDialog`, not `window.confirm`

**Decision:** Confirming a delete (or any other destructive action)
uses shadcn/ui's `AlertDialog` (`src/components/ui/alert-dialog.tsx`),
not the browser's native `window.confirm`.
**Reason:** The project owner asked for "um componente mais bonito, de
preferência da lib de UI" (a nicer component, preferably from the UI
lib) after `window.confirm` shipped as the original Tags delete flow —
a native browser dialog can't be styled or translated consistently with
the rest of the app and can't be driven from automated tooling
(confirmed as a real limitation when reviewing a live test run).
**Impact:** Same one-instance-per-page pattern as the create/edit
`Dialog`: a `deleteTarget` state opens the `AlertDialog`, naming the
record in `AlertDialogDescription`. `AlertDialogAction` closes itself
by default on click — `event.preventDefault()` inside its `onClick`
keeps it open until the async delete actually resolves, so a failure
can show an error inline (`StatusMessage`) instead of silently closing.
Extracted into `shared/presentation/components/DeleteConfirmationDialog.tsx`

- `shared/presentation/hooks/useDeleteConfirmation.ts` once Tags,
  Categories, and Services all needed the identical shape — see either
  feature's `*DeleteDialog.tsx` for the thin, entity-specific wrapper.

### `CreatableSingleSelect`/`CreatableMultiSelect` stay separate components

**Decision:** Evaluated extracting a shared `CreatableSelectPanel<T>`
internal component for the popover content (loading/error/list/create-
button) both selects render. Kept them as two separate components instead.
**Reason:** The two differ in ways that are load-bearing, not incidental:
single-select selects-and-closes with an optional leading "none" item;
multi-select toggles-and-stays-open, shows a per-item color dot, and
renders removable chips below the trigger. Unifying the list/loading/
error rendering into one generic component would need `isChecked`/
`onSelectItem`/`renderLeadingItem`/`ariaMultiselectable` parameters
threaded through both call sites — ending up with comparable complexity
to the ~50 duplicated lines it would save, while making both call sites
harder to read.
**Impact:** The loading/error-state JSX blocks are genuinely identical
between the two files - if a third genuinely-identical consumer appears,
re-evaluate extracting just that block, not the whole panel.

### Language: pt-BR user-facing text

**Decision:** Every string the app shows or announces to a user —
headings, button/link labels, form labels and hints, `aria-label`s,
`window.confirm` prompts, `StatusMessage` text, error-message fallbacks
— is written in Brazilian Portuguese (pt-BR). Code (identifiers,
comments, commit messages, this doc) stays in English as before; only
the rendered/announced surface changed.
**Reason:** Explicit project-owner instruction: "todas as mensagens,
alertas devem estar em portugues BR."
**Impact:** `TagsPage`/`TagForm`/`AdminLayout`/`LoginPage`/
`CallbackPage`/`PlaceholderPage` were translated in full, including the
6 stub-page `title` props and the sidebar's `NAV_ITEMS`. Two shadcn
primitives were also touched — `components/ui/spinner.tsx`'s
`aria-label="Loading"` and `components/ui/dialog.tsx`'s sr-only "Close"
text — since a literal, currently-rendered accessibility label counts
as a real, current need, not the speculative extension
`[[feedback-shadcn-minimal-customization]]` warns against.
Reachable `DomainError`/`Error` messages were translated too
(`domain/entities/Tag.ts`'s four validation messages,
`infrastructure/http/UnauthenticatedError.ts`, and the three "no
tenant context" guards in `presentation/hooks/useTags.ts`) — traced by
following each error class to what catches it, confirming whether
`.message` can actually reach a `StatusMessage`. Left untranslated:
`InvalidSessionError`/`InvalidTenantError`/`InvalidUserError`/
`MissingTenantClaimError`, `oidcUserToSessionMapper`'s `expires_at`
guard, the `useAppContainer`/`useTheme` "must be used within a
Provider" guards, `container.ts`'s missing-env-var guard, and
`main.tsx`'s missing-root-element guard — all are startup/programmer-
error assertions that die before any route or `StatusMessage` exists in
a correctly wired app, not real user-facing messages. Revisit only if
one of those paths becomes genuinely reachable (e.g. `CallbackPage`
starts displaying `error.message` directly).
**Impact on future work:** every new feature vertical's page component
is pt-BR from the start — see the "Language" section in
`agent-skills/agenza-frontend-feature/SKILL.md`.
