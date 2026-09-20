# admin-frontend — Architecture

A pragmatic map of how this app is built and **why it looks the way it does**. It
summarises decisions taken across the OIDC-shell work and the API-layer iterations;
for the blow-by-blow see [`specs/001-oidc-shell-scaffold/`](../specs/001-oidc-shell-scaffold/).

§1–§5 describe what's settled. **§6 is the honest counterpart** — what's a placeholder,
what we consciously left out, and what doesn't exist yet. Read both.

Two rules of thumb behind everything here:

- **Abstraction proportional to the problem.** Lean wiring, invested domain structure.
  "Código bom é código não escrito" — the simplest thing that is correct _and_ explicit.
- **The types protect you from forgetting.** Version, tenant, response envelope, wire
  drift — that cost is paid once, in `shared/`, so no call site ever restates it.

---

## 1. Shape

```
src/
├── app/                     Composition root — providers, route table, ErrorBoundary
│   ├── shell/               AppShell chrome: responsive nav (sidebar/rail/bottom), header,
│   │                        command palette, shortcut help sheet
│   └── pages/               One stub per route (§6) — not feature slices; no model, no api
├── features/<slice>/        One vertical slice per user-facing capability (auth, tags, …)
│   ├── model/               Types + rules. No React. ( = domain + application )
│   ├── api/                 Backend gateway — repositories. ( = infrastructure )
│   ├── ui/                  Everything that imports React
│   │   └── pages/<Page>/    One folder per route: <Page>.tsx (shell) + use<Page>.ts (form
│   │                        state) + route.ts (loader/action), all re-exported by index.ts
│   └── index.ts             The slice's ONLY public surface
└── shared/                  Cross-cutting, no business logic
    ├── api/                 servicesFacade, servicesApi (its composition), apiClient,
    │                        unwrap (Result → exception at the framework boundary), generated types
    ├── session/             Session core — no identity-provider knowledge
    │   ├── sessionMachine.ts   pure reducer, reduceSession(event): AuthSnapshot
    │   ├── sessionStore.ts     snapshot, subscribe, dispatch, getAuthCredentials
    │   ├── session.ts          types, including SessionPrincipal
    │   └── tenant.ts           decode the tenant_id claim from the access token
    ├── theme/               Three-state (light/dark/system) store, shaped like shared/session's
    │                        snapshot/subscribe/reducer; data-theme, handed to identity-service
    ├── keyboard/            Shortcut registry: single-character + modified, keyboard-device
    │                        detection for when a resting keycap may render
    ├── ui/                  Base UI primitives (owned source), lib/utils.ts (cn())
    ├── env.ts               Fail-fast loader for the six VITE_* vars
    └── logger.ts            Minimal structured console wrapper
```

**Feature-Sliced Design segments**, chosen over `domain/application/infrastructure/presentation`
folders: same principles, less nesting, names any dev reads immediately. A segment's purity is
proven by its mock-free tests, not by its folder name.

**Dependency direction** — enforced, not just intended:

- `app` → `features` → `shared`. Never up: `shared/` imports neither `features/` nor `app/`, and
  `features/` never imports `app/`.
- Within a slice: `ui` → `model` / `api`, and `api` → `model`. The domain entity is defined in
  `model/` and imported by the layers that use it — the wire layer never owns it.
- **Functional core, imperative shell** — and the one `model → api` edge it still needs. The pure
  core (`sessionMachine.ts`'s `reduceSession(event): AuthSnapshot`, plus `session.ts`, `tenant.ts`,
  `sessionStore.ts`) sits in `shared/session/` and carries no OIDC reference at all — not even
  `import type`. The shell is `features/auth/model/sessionDriver.ts`: it subscribes to the
  `oidc-client-ts` `UserManager` events, maps a `User` to a `SessionPrincipal`, and dispatches into
  the shared store. That `sessionDriver` → `../api/authClient` import is the `model → api` edge, kept
  inside `auth`. The core dropping a layer is exactly what lets `shared/api/servicesApi.ts` compose
  the facade over `getAuthCredentials` with nothing reaching up
  ([ADR 0037](../../../docs/adr/0037-admin-frontend-session-core-in-shared.md)).
- The whole direction is mechanically enforced, not just the barrel. Three `no-restricted-imports`
  blocks in the flat config: the base bans `@/features/*/*` (reaching past a slice's `index.ts`)
  everywhere; `src/shared/**` additionally may not import `@/features/*` or `@/app/*`; `src/features/**`
  may not import `@/app/*`. Relative imports inside a slice are unaffected. Flat-config gotcha (noted
  in `eslint.config.js`): a later block's `no-restricted-imports` **replaces** the base one for
  matching files rather than merging, so each block restates every pattern it must keep — the
  `src/features/**` block repeats the `@/features/*/*` barrel ban.

**Route pages are shells.** `<Page>.tsx` holds no `useEffect`/`useState`/`useRef` of its own; all
effect and state logic lives in that page's **own** hook (`useLoginRedirect`, `useAuthCallback`,
…). Hooks are never shared between pages — the one exception is a pure Context accessor like
`useAuth`. Sub-components go in a `components/` subfolder, created only when a page actually grows
them.

**A page's `loader` and `action`, when it has them, live in `ui/pages/<Page>/route.ts`** and are
re-exported from the slice barrel, so `app/routes.tsx` wires them by importing `@/features/<slice>`
— the dependency still runs `app → features`. Server data then reaches the shell through
`useLoaderData()` / `useActionData()` / `useFetcher()`, never through page-owned state — this is the
shape to reach for when a page has a `loader`, not a requirement every page carries.
`features/tags/ui/pages/TagListPage` doesn't have one today: `useTagListPage.ts` fetches
`tagsRepository.list()` directly from a plain `useEffect`, the same page-owned-hook shape every other
page in this app already uses, with a `status: 'loading' | 'ready' | 'error'` derived from comparing
the in-flight query against the last-resolved one, not stored as its own `setState`. Three different
`loader`/`action` shapes were built for this exact route and backed out of, each for a different
reason — §5 has the full history of all three.

**A page's own hook keeps its type declarations in a sibling `use<Page>.types.ts`**, the same split
`shared/ui/` already uses for `<name>.types.ts` (below) — `useTagListPage.types.ts` is the first one.
**Filter or search state the person expects to survive a reload, or share as a link, belongs in the
URL** (`useSearchParams()`), independent of whether the page has a `loader` — a page-owned `useEffect`
fetch reads and writes it exactly as a `loader`-driven page would, it just isn't blocked on it.

**Every `shared/ui/` component is a folder, not a flat file** — the same pasta-por-unidade instinct
as the page pattern above, extended to primitives (`specs/005-shared-ui-component-folders/`).
`index.tsx` is always present and is the only file that changes with `@/shared/ui/<name>` from
outside. Two more files exist only when there is real content for them, mirroring the
"`components/` subfolder created only when a page actually grows them" rule: `<name>.types.ts` holds
only type declarations and is skipped when a component has no bespoke type (a `cva()` call's derived
`VariantProps` stays with the component that defines it, never in the types file — moving it would
just relocate style logic into a file meant to hold none); `components/` is skipped when a component
exports nothing but itself. A component qualifies for `components/` when it exports more than one
coupled component (`Dialog` + `DialogContent` + …) **or** when a single exported component's render
logic and type surface are complex enough to hurt readability as one file (`confirm-dialog`, five type
declarations and two conditional render branches, still a single export) — judged qualitatively in
review, the same judgment call already used for D5 below, deliberately with no line-count or
type-count threshold. **That judgment call reruns on every edit, not only at creation** — a render
branch, prop, or conditional added to an existing `index.tsx` is checked against the file's whole
current shape, not just the diff introducing it. `list-section` is the counter-example: it grew all
five of loading/error/empty/table/list inline, across five same-day commits, because each commit's
review looked only at its own diff, never at the accumulated file — see §5. When a change pushes an
existing `index.tsx` past this criteria, default to extracting into `components/`, not to leaving it
inline "for now." Inside `components/`, only a sub-part with real weight gets its own file —
composing other components, owning local state/handlers/refs, or a className long enough to justify
isolation on its own; sub-parts without that weight (a single-element wrapper, a static or
CSS-selector-only className, no JS conditionals) are bundled together in one `<name>-primitives.tsx`
instead of one file each. Sub-parts inside `components/` are never imported from outside their own
component's folder — only through `index.tsx`. `FullScreenMessage/` is the one folder that keeps its
source file's exact PascalCase instead of kebab-case, because renaming it would change its import
path.

**Inside `components/`, some shapes read better than others.** General rules, independent of what the
component does or how many sub-parts it has:

- **Early return over a mutable accumulator.** `let result = null; if (...) { result = ... } else if
(...) { result = ... }` forces the reader to hold reassignable state in their head, and tends to
  nest a level deeper than the same branches written as early returns in whichever component owns
  them.
- **Pass a discriminated union whole; don't destructure it in the parent.** When a prop type is a
  discriminated union (an `a?: never` / `b?: never` pair, or any tagged-variant shape), hand the
  whole union to the component that actually branches on it, as one prop, and narrow it there.
  Picking a member out in the parent and passing it down as a separate optional prop is how a manual
  capture (`const x = props.x`, assigned just to survive narrowing lost across a closure) ends up
  looking necessary — narrowing the union at its own point of use needs no such workaround, because
  there's nothing deferred between the check and the read.
- **Extract a shared base prop interface once three or more sibling types repeat the same fields, not
  before.** At two repetitions the `extends` indirection costs more than the line it saves.
- **A prop's declared type is part of the contract — audit it, don't just trust it.** A literal-union
  value that no branch of the component ever reads is dead API surface pretending to be a feature.
  Grep every read of a prop before trusting its type, on every edit, not only when the type is first
  written.
- **A prop whose absence is an accessibility gap is required, not optional.** An accessible name on
  anything with a list, table, dialog, or similar role, with no other source of a name, is exactly
  this case — optional-by-default ships a silently unlabeled region the type system will never flag.
- **A test asserts the effect a prop causes, not just that passing it doesn't crash.** Rendering with
  a prop set and asserting on unrelated output tests that the component tolerates the prop, not what
  the prop actually does.
- **When a component has more than one mutually exclusive presentation, compare their visual
  treatment deliberately — don't assume consistency.** Two variants of the same visual family (a
  table and a list, two `cva` variants, a light and a dark rendering) drifting apart in surface,
  border, or elevation is easy to miss, because no single diff ever shows both at once.

`list-section`'s retrofit (§5) is one worked trail through all seven — read that row for the
component-specific before/after; the rules above are what should carry over to the next component,
whatever it renders.

---

## 2. Talking to the backend

Three layers, each stating exactly one thing. A repository states **none** of: the token, the
tenant, the API version, the response envelope, or exception handling.

| Layer       | File                                                      | Job                                                                                                                                                                                                                                                                                                                 |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client      | `shared/api/apiClient.ts`                                 | `openapi-fetch` client; middleware attaches `Authorization: Bearer` + `X-Tenant-Id`, fails closed with no session. Feature-agnostic.                                                                                                                                                                                |
| Credentials | `shared/session/sessionStore.ts` → `getAuthCredentials()` | Non-React reader over the session store; returns `{ accessToken, tenantId }`, read fresh per request.                                                                                                                                                                                                               |
| Facade      | `shared/api/servicesFacade.ts`                            | `servicesApi` (`get`/`post`/`put`/`del`). Injects `v{version}` into the path, unwraps the `{ data, success, … }` envelope, returns `ApiResult<T>`.                                                                                                                                                                  |
| Composition | `shared/api/servicesApi.ts`                               | `createServicesFacade(createApiClient(getAuthCredentials))`. Every import is `shared/*`, so the wiring lives in `shared/` and no repository ever reaches up to `app/` for a client — the inversion the `shared/session` move ([ADR 0037](../../../docs/adr/0037-admin-frontend-session-core-in-shared.md)) removed. |

**`servicesApi` never rejects.** `run()` (the whole of it) is a `try/catch`:

- `2xx` → `ok(payload)` — payload lifted out of the envelope, typed from the OpenAPI spec.
- `non-2xx` with an RFC 7807 `application/problem+json` body → `fail(problem)` verbatim.
- no authenticated session — the client's middleware threw `MissingSessionError` → `fail(SESSION_PROBLEM)`.
- a thrown fetch (offline, DNS, connection refused) → `fail(NETWORK_PROBLEM)`.
- a `non-2xx` whose body isn't a Problem (a gateway 5xx, an empty error) → `fail(SERVER_PROBLEM)`.

`SESSION_PROBLEM` / `NETWORK_PROBLEM` / `SERVER_PROBLEM` are `ApiProblem`s (`status: 0`, namespaced
`code`) exported from the facade — the UI branches on them exactly like a backend Problem. Splitting
`SESSION_PROBLEM` out of the transport bucket is what keeps an expired session from reading as "no
connection". Because the one place that turns HTTP into `ApiResult` also owns a failed transport,
**a repository does zero exception handling and a page has no `try/catch`.**

**A repository is a thin typed delegation.** Its domain entity is hand-written, owned by the
frontend (not `components['schemas']['…']`), and lives in `model/`. When the entity is structurally
what the endpoint returns, the repository forwards the result verbatim — the return annotation is
the one compile-time checkpoint against a breaking wire change. A `toDomain(dto)` mapper is added
only when wire and domain genuinely diverge.

`features/tags/api/tagsRepository.ts` is the first repository built against this pattern
(`specs/003-tags-crud/`), replacing the illustrative, since-deleted `categoryRepository`
([ADR 0038](../../../docs/adr/0038-admin-frontend-remove-categories-harness.md)) as the reference:

```ts
// features/tags/api/tagsRepository.ts
import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Tag } from '../model/tag';

function list(search?: string): Promise<ApiResult<Tag[]>> {
  return servicesApi.get('/api/v{version}/tags', {
    query: search ? { Search: search } : undefined,
  });
}
```

`Tag` and the generated `TagResponse` are structurally identical, so `list` forwards the facade's
result verbatim — no `toDomain` mapper — and the `Promise<ApiResult<Tag[]>>` return annotation is
the one compile-time checkpoint against a breaking wire change. `list` and `delete` (exported as
`tagsRepository.delete`, backed by a `deleteTag` function since `delete` can't name a function
declaration) are the repository's two functions today; `get` / `create` / `update` existed briefly
for a create/edit/delete UI that was later pulled back out (§5), and delete alone came back since
(§5) — the backend still serves all five `/tags` endpoints, this repository just doesn't call the
other three.

**Errors are values, never exceptions.** `Result<T, E> = { ok: true; data } | { ok: false; error }`
with `ok()` / `fail()` in `shared/result.ts` — custom, ~6 lines, no library. No `unwrap()`-that-throws.
The interface layer branches on `result.ok`, then on `result.error.code` / `.status`, renders
`result.error.title`, reads `result.error.errors` directly.

**`Result` is the internal currency; the framework boundary is the cashier.** `servicesApi` never
rejects, but React Router and TanStack Query signal failure _only_ by a rejected promise — a
`loader` or `queryFn` that returns `{ ok: false, error }` reads as success. `shared/api/unwrap.ts`
converts, in exactly one place:

| Boundary               | Converts?                          | Why                                                                                        |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `repository → loader`  | `unwrapOrThrow`                    | the router signals failure only by rejection                                               |
| `repository → queryFn` | `unwrapOrThrow`                    | same; without it every query resolves "ok" with an error inside                            |
| `action` / mutation    | **no** — `Result` straight through | a validation error (400 with `errors`) is expected flow and returns to the form as a value |
| below that             | no                                 | plain `Result`; no new `try/catch`                                                         |

_"`Result` é a moeda interna; a fronteira do framework é o caixa."_

> The third row is the one that gets misread. A dead network is exceptional; "name already taken"
> is not. Routing both down the rejection path turns validation into an error screen.

**A list-loading hook must not confuse "hasn't loaded yet" with "failed to load."** A boolean
`isLoading` plus "empty means `items.length === 0`" conflates those with "loaded and empty" — the
first two look identical to the reader if the code doesn't keep them apart.
`shared/ui/list-section` takes an explicit `status: 'loading' | 'error' | 'ready'`, set only inside
the `result.ok` branch for `'ready'` and only in the failure branch for `'error'` — `'ready'` is
never set, and `'error'` is never skipped, based on `items.length`. `features/tags` is the reference
implementation: `useTagListPage.ts` derives `status` by comparing the query currently in flight
against the last one a response resolved for, rather than storing it (§5). A listing hook's own job
is listing — every repository failure maps to `'error'` the same way, and deciding what an expired
session means for navigation is deliberately not this hook's problem. That is **not** the same as an
expired session being handled somewhere else in the app — right now it isn't; §6 tracks it as an
open gap.

**`list-section` renders its own empty and error states — neither is a prop the page configures.**
Once `status` says `'ready'`, it checks `items.length` itself and shows one fixed "Nenhum item
encontrado." instead of the rows or table; inferring emptiness this way is safe here specifically
because the page has already confirmed success via `status` first — unlike inferring "empty" before
knowing whether the fetch even succeeded, which is the original bug this component exists to
prevent. `status === 'error'` renders one fixed "Não foi possível carregar." the same way, with no
retry control at all.

This is a deliberate departure from ADR 0020's failure standard (a stable code, a curated
explanation, a recovery action) — a generic, reusable table component doesn't know a per-feature
error message, code, or what "retry" should even do, so `list-section` doesn't attempt any of it.
The cost is real and explicit: a failed `list-section` load has no code, no specific explanation,
and no way to recover short of a full page reload; a "never created" catalog and a "search matched
nothing" empty case now read identically, and there's no action slot for a per-feature "limpar
busca". A feature that needs ADR 0020's fuller treatment builds it directly with
`shared/ui/error-state` (the same primitive `list-section` uses internally) instead of routing it
through `list-section`'s `status` prop. Search stays page-owned too: `toolbar` is not a
`list-section` prop, so a search box sits beside the component in the page's own markup, not
inside it.

Full wiring detail: [`contracts/api-client-contract.md`](../specs/001-oidc-shell-scaffold/contracts/api-client-contract.md).
Exemplos reais de request/response — sucesso, validação, conflito, 404, autenticação/tenant —
verificados ao vivo contra o `services-service`, incluindo formas de erro que o `services-api.d.ts`
gerado não cobre: [`docs/API.md`](../../../docs/API.md).

---

## 3. Auth & tenancy

- **OIDC Authorization Code + PKCE** against `identity-service` via `oidc-client-ts` (no
  `react-oidc-context` wrapper, no hand-rolled PKCE).
- **`AuthProvider`** exposes the session snapshot through a plain React Context;
  `useSyncExternalStore` subscribes to the `shared/session` store. The `UserManager`'s event
  emitter is wired to that store by `sessionDriver` (below), not by the provider. No DI container.
- **Session state machine** is a pure `reduceSession(event): AuthSnapshot` in
  `shared/session/sessionMachine.ts` — zero React, zero `oidc-client-ts` (not even `import type`),
  tested directly with `SessionPrincipal` fixtures and no mocking. `AuthProvider` reads the store
  from `shared/session` and drives it through `startListening` / `login` / `logout` in
  `features/auth/model/sessionDriver.ts`.
- **Tenant comes only from the access token's `tenant_id` claim** — never from URL, query, or
  `localStorage`. The frontend only **decodes** that token: `shared/session/tenant.ts` runs
  `atob` + `JSON.parse` on the payload and reads the claim; it does not verify the signature, and
  isn't meant to. The `X-Tenant-Id` header `apiClient`'s middleware attaches from that claim is a
  **routing convenience, not a security boundary** — it's also **stripped from the generated types**
  (`generateApiTypes.mjs`) so no call site can set it by hand. The boundary is the backend refusing
  any request whose header doesn't match its own validated token claim:
  [ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md).
- **Fail closed.** `ProtectedRoute` redirects when the session isn't `authenticated`; the client
  throws `MissingSessionError` rather than send a request with a missing token or tenant, and the
  facade surfaces that to the UI as `SESSION_PROBLEM` ("entre novamente"), not a network error.

---

## 4. Principles

- **No `what` comments, no JSDoc.** Code self-documents (senior team). A terse `why` comment is
  allowed only for a genuine race or a non-obvious constraint.
- **No exceptions for control flow.** `Result` end to end.
- **The facade is smart so call sites are dumb.** You never restate `version`, `X-Tenant-Id`, the
  envelope, or error handling — the architecture protects against forgetting them. The type
  machinery in `servicesFacade.ts` looks heavy but every derivation buys a caller guarantee
  (`CallOptions` hides version + forbids a body on a GET; `Payload` makes a breaking wire change
  fail to compile). Simplifying further would mean pushing that work onto every repository.
- **Pages are shells; logic is in the page's own hook.**
- **Types over folder names.** A layer is "pure" because its tests need no mocks.

---

## 5. Decisions log

Chosen, and — just as important — tried and backed out of, so nobody re-litigates:

| Decision                                                                                                                                             | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FSD segments over `domain/application/infrastructure/presentation`                                                                                   | Practice-oriented reading of the same principles, less nesting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Custom `Result` (not neverthrow / Effect)                                                                                                            | ~6 lines, no dependency, no `unwrap`-that-throws; the boundary conversion is single-sited in `shared/api/unwrap.ts` — [ADR 0034](../../../docs/adr/0034-admin-frontend-custom-result-type.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `openapi-typescript` + `openapi-fetch`, kept                                                                                                         | A hand-rolled typed client would be _more_ code (URL/query/path serialization, content negotiation).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| No server-state library (TanStack Query, SWR, …)                                                                                                     | A repository call from a `loader`, an `action`, or a page's own hook all cover one screen equally well without one; when a query lib lands it **replaces** the repository — [ADR 0035](../../../docs/adr/0035-admin-frontend-no-server-state-library.md). `features/tags` cycled through three shapes for the exact same list screen (§5 has all three): a single-route `loader`/`action` (reverted, `5e48593`, no cross-route need yet); a list-only `loader`, added once `/tags` briefly split into four routes needing cross-route revalidation and kept even after those routes reverted, until a blocking loader proved it can't show its own page's loading state; and, currently, a plain `useEffect` fetch in `useTagListPage.ts`, the same shape as the very first version. No query library needed at any point in that cycle — the churn was over which non-library shape fit the screen that week, not whether one was missing. |
| Error normalization **inside `run()`**                                                                                                               | A short-lived call-site `settle(call)` wrapper was tried and removed — it was one more thing every caller had to remember. The HTTP layer owns it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **No request-cancellation layer**                                                                                                                    | Facade `AbortController` + `useApiResource` built and reverted twice; the effect `ignore`-flag fixes the only real bug. Revisit for search-as-you-type or a large export — [ADR 0033](../../../docs/adr/0033-admin-frontend-no-request-cancellation-layer.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `Category` entity in `model/`, not `api/`                                                                                                            | The UI was reaching through to the backend layer just for a domain type — inverted dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Removed `lucide-react`, `msw`                                                                                                                        | Zero imports anywhere; `msw` was never wired (tests use `vi.mock`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `lucide-react` reinstated for `specs/002-ui-foundation/`; `msw` stays removed                                                                        | Every icon in the new shell and pages needs one; best bundle-to-icon-count ratio of the candidates. `msw`'s absence was unrelated to icons and nothing in this feature needed network-level mocking.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| shadcn/ui + Tailwind, remapped to `shared/ui` + `shared/lib`, on **Base UI** (not Radix)                                                             | Owned component source over a black-box dep; one choice covers "UI library" + "CSS framework". Base UI ships Toast and Combobox, so `sonner` and `cmdk` are never added — D1, [ADR 0039](../../../docs/adr/0039-admin-frontend-base-ui-primitives.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Three-state theme (`light`/`dark`/`system`), hand-rolled in `shared/theme/`, not `next-themes`                                                       | Same snapshot/subscribe/reducer shape as `shared/session`; `next-themes` carries SSR machinery this client-only SPA has no use for and has open React 19 issues. `data-theme` + the `admin-theme` storage key are byte-identical to identity-service's, which is what makes the cross-app handoff work — D2, [ADR 0040](../../../docs/adr/0040-admin-frontend-three-state-theme.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| No animation library (`motion`, `tw-animate-css`)                                                                                                    | Every overlay animates on Base UI's own `data-starting-style` / `data-ending-style` attributes plus a plain Tailwind `transition` — the mechanism already had to exist for Base UI's overlays, so a library would duplicate it — D3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Keycap hints derived from the shortcut registry, never hand-typed; no `shortcut` prop on the generic `Button`                                        | A hand-typed `<Kbd>` drifts silently the first time a binding changes; sourcing every keycap from the registry makes announcing a shortcut that doesn't exist structurally impossible. Evidence is tiered by how often a control appears on screen — at most once per screen for a resting keycap — D4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `shared/ui/` excluded from the coverage gate by name, not by directory; `shared/theme/**` and `shared/keyboard/**` are never excluded                | Two different reasons share one list: presentational primitives with no logic of their own would buy ceremonial tests, and `dropdown-menu`/`combobox`/`sheet`/`toast` have real logic but ship shadcn subcomponents (submenus, chips, groups) with no product consumer yet — file coverage can't isolate the consumed part, so review enforces that half. `tooltip` and `input-group` stay **in** the gate: fully or mostly exercised for real, so excluding them would hide coverage instead of counting a gap — D5.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Minimal in-app logger, no telemetry backend                                                                                                          | `shared/logger.ts` wrapping `console`, structured, no PII beyond tenant id.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| OIDC session kept in `localStorage`                                                                                                                  | A second tab reuses the session; accepted threat is an XSS on our origin reading the token; in-memory + `httpOnly` cookie rejected (needs a backend change) — [ADR 0036](../../../docs/adr/0036-admin-frontend-oidc-session-in-localstorage.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Session core in `shared/session`                                                                                                                     | Store, reducer and tenant decode moved out of `features/auth` / `app/` so the composition descends with them; no feature imports `app/`, and ESLint now enforces both directions — [ADR 0037](../../../docs/adr/0037-admin-frontend-session-core-in-shared.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `features/tags` — first real business feature slice                                                                                                  | Exercises the FSD slice and the repository pattern end to end for the first time (§1–§2 were written for this moment); a `loader`/`action` came with it too, on and off since (§5 has how that evolved). A fixed-option `shared/ui/color-swatch-picker.tsx` primitive (since removed, §5) and a `CommandPalette` entry outside `NAV_DESTINATIONS` came with it too — `specs/003-tags-crud/`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `shared/ui/confirm-dialog.tsx` extracted from `DeleteTagDialog.tsx`; presentational only, no `useFetcher`/`toast` of its own                         | The dialog's confirm/blocked/transient-retry state machine wasn't tag-specific to begin with — only the copy and the submit call were. The component receives already-derived state (`isSubmitting`, a classified `failure`) instead of owning submission, because `useFetcher<typeof action>()` is typed per route and can't be generic inside a shared component; each consumer keeps its own fetcher + success toast, same pattern `TagFormDialog.tsx` already used. `isTransientProblem` (the network/session/server-vs-everything-else split, already generic) moved alongside the sentinels it reads in `shared/api/servicesFacade.ts`. Not added to `coverage.exclude` — real logic, real consumer from day one, same precedent as `color-swatch-picker.tsx` — `specs/004-shared-confirm-dialog/`.                                                                                                                                   |
| Every `shared/ui/` component is a folder (`index.tsx` + conditional `<name>.types.ts` + conditional `components/`), not just the ones with sub-parts | Started as a request to segregate only compound components; widened mid-feature to all 20, so `shared/ui/` wouldn't have some components in a folder and others as a flat file depending on an internal-only distinction. `kbd.tsx` was first classified as a simple atom and left flat — wrong, it exports `Kbd` + `KbdGroup`, same shape as `avatar`/`card` — caught by re-deriving the export list from source instead of trusting the file's line count. All 16 `coverage.exclude` entries for `shared/ui/` became folder globs (`shared/ui/<name>/**`) in the same pass, so no component's coverage status moved as a side effect of the file move — `specs/005-shared-ui-component-folders/`.                                                                                                                                                                                                                                         |

| `shared/ui/list-section.tsx` (+ `empty-state`, `error-state`) extracted from `TagsPage.tsx`; `route.ts`/`loader`/`action` for tags removed in the same lineage | The loader/action/`useFetcher()` pattern §1 used to describe was real for a short time, then reverted (commit `5e48593`): indirection for a single feature with no shared list to revalidate beyond itself. `useTagsPage` now calls `tagsRepository` directly. Meanwhile the loading/empty/error/row rendering that _was_ inline in `TagsPage.tsx` moved to three small presentational primitives, since none of it was tag-specific — only the copy and the row's own markup were. `list-section` ships two rendering modes, decided after comparing both against a many-column mockup: `columns` (a real `<table>` with `<th>` headers) and a simpler `renderItem` mode (a plain `<ul>`, no header). `TagsPage` renders its three fields (Nome/Descrição/Ações) through `columns` — Etiquetas has real, named fields, so a header row earns its keep; `renderItem` currently has no consumer, kept for a future listing that isn't naturally columnar (a feed, a timeline). All three primitives are excluded from the coverage gate by name, same reasoning as `button`/`badge` — pure prop-driven renderers, no state or effects of their own. |
| `shared/ui/list-section/` retrofitted into `index.tsx` + `components/list-section-{skeleton,ready,table,list}.tsx`; §1's `components/` criteria now rechecked on every edit, not only at creation | `index.tsx` grew loading/error/empty/table/list all inline across five same-day commits, each reviewed for its own behavior diff only, never for the file's accumulated shape — the same shape `confirm-dialog` had before its own retrofit two days earlier (`specs/005-shared-ui-component-folders/`), except `list-section` was born the day _after_ that sweep and so never got one of its own. Rather than rely on the next periodic reorganize pass to catch it, §1's judgment call now reruns per edit so the next accretion is caught before it needs a retrofit. A first pass left the `status === 'ready'` branch (empty vs. `columns` vs. `renderItem`, a mutable `let` plus manual narrowing captures to survive the JSX closure) inline in `index.tsx`; `list-section-ready.tsx` now owns that dispatch as three sibling early returns over a single `renderMode: ListSectionRenderMode<T>` prop, which narrows cleanly without the capture workaround because it's a plain parameter, not a property access re-read through a closure. `index.tsx` is left a flat three-way `status` switch with no branching logic of its own. |
| `shared/ui/list-section`'s prop contract tightened: `aria-label` required, dead `align: 'start'` removed, `ListSectionItemsProps<T>` extracted, `bg-card` added to table mode; §1 gained shape/contract guidance (early returns over an accumulator, pass a discriminated union whole, extract a shared base prop type at 3+ repeats, no dead literal values, required over optional for accessible names, assert a prop's effect not just its presence) | Closing pass after the retrofit above, done deliberately front-to-back rather than fixing issues as they were noticed. `align: 'start'` was checked nowhere in `list-section-table.tsx` and had zero consumers — same effect as omitting the field. `ListSectionReadyProps`/`ListSectionTableProps`/`ListSectionListProps` each repeated `items`/`getKey`/`ariaLabel` verbatim — three repetitions, the point at which this codebase extracts rather than tolerates it, so `ListSectionItemsProps<T>` now holds the three fields and the others `extends` it. `aria-label` being optional meant a table could ship with no accessible name and nothing would catch it. `align: 'end'`, `className`, and the `skeletonRowCount` default all rendered under test already but had no assertion on the behavior itself. The `bg-card` gap between table and list mode predates every commit above (present since `cdff745`) and was only confirmed by rendering both against the compiled `dist/assets/*.css` — this app doesn't run outside Aspire, so that's the lightest way to check a pure-CSS change without the full stack. §1's new guidance exists so the next `components/` split starts from this shape instead of re-discovering it, stated generically there — this row is where the component-specific receipts live. |
| `/tags` briefly split into four routes (`/tags`, `/tags/new`, `/tags/:id/edit`, `/tags/:id/remove`) for create/edit/delete, sharing the list via a dialog-over-`<Outlet/>` pattern; backend gained `GET /api/v{version}/tags/{id}` (`TagsController.GetById`) partway through so edit/remove could fetch their own tag instead of reading the list's already-loaded data | First nested route tree in the app, and the first time `route.ts` came back with a `loader` after the single-route revert (`5e48593`) — four routes now shared one list, needing a loader to revalidate through on every mutation's success. Reverted in full by the row below; nothing built here survives in the code today. The backend endpoint is the one piece still standing with no caller left — removing backend behavior with unknown other consumers was judged a separate call from keeping this app's own UI honest (next row). |
| `/tags` reverted from the four-route CRUD split back to a single list-only route | Create, edit and delete were pulled from the app; `/tags` only lists. Everything the row above built on top of listing — the extra pages, the shared tag-by-id loader, a not-found/error dialog, the form-field component, all of `model/tagForm.ts`, and `shared/ui/color-swatch-picker` (no consumer left, and unlike `confirm-dialog` it had no test of its own to keep it honest in isolation) — had no remaining caller once the decision landed, so it came out with the routes rather than staying as dead code the next reader has to independently confirm is unused. `tagsRepository`/`model/tag.ts` are trimmed to `list`/`Tag` only; `app/routes.tsx`'s `tags` route dropped its children and its now-pointless route `id`. `shared/ui/confirm-dialog` was left alone deliberately — it has its own generic, tag-free unit tests and was built explicitly to be reusable by the next delete-confirmation flow, not tag-specific debris. The backend keeps `GetById`/`Create`/`Update`/`Delete` on `TagsController` untouched — removing backend behavior that may have other consumers is a separate call from keeping this app's own UI honest about what it currently does. |
| `TagListPage/route.ts` removed again; `useTagListPage.ts` goes back to fetching `tagsRepository.list()` directly from a `useEffect`, same shape as the pre-loader `useTagsPage` | Discovered by using the feature: with a blocking `loader`, `TagListPage` never mounts until the fetch already resolved, so `list-section`'s `status: 'loading'` skeleton was structurally unreachable — not just on first entry (the previous page stays on screen while the loader runs; nothing in the app reads `useNavigation()` to show anything during that wait, confirmed by grep — a shell-level indicator would fix that half but wasn't built, out of scope of a single slice) but also on every re-search, since a `loader`-owned re-fetch keeps the old rows mounted with zero feedback until the new ones land. The row above kept the loader on the reasoning that `route.ts` is now this app's standard shape for a page with server data, independent of route count — reconsidered once it became clear that standard shape can't actually show its own page loading, which a plain fetch trivially can (the page already exists to have a `status` on). `useTagListPage` derives `status` (`'loading' \| 'ready' \| 'error'`) by comparing the in-flight `query` against the last-resolved one, rather than an explicit `setStatus('loading')` inside the effect — the latter trips `react-hooks/set-state-in-effect` (a synchronous `setState` at the top of an effect body forces an extra render before the async work even starts; the rule wants `setState` only in the callback that reacts to the external system, which the `.then()` branches already were). An `ignore` flag guards the same request-race `useTagsPage` never had to think about while search was UI-less: two re-searches in flight, and a slower/older one resolving after a newer one must not clobber it — the established mitigation for exactly this gap per [ADR 0033](../../../docs/adr/0033-admin-frontend-no-request-cancellation-layer.md). The search `<Form method="get">` (URL-synced, loader-driven) is a plain `<form onSubmit>` again: an uncontrolled `<input ref>` for what's typed, submitted into `query` state, so typing still doesn't refetch and Enter/"Buscar" both funnel through the one `onSubmit` handler. Traded away at this point, faithfully matching what the pre-loader `useTagsPage` already didn't have: the search term no longer survives a hard page reload — the next row puts it back without reintroducing the loader. |
| `?q=` back in the URL — `useTagListPage` reads/writes it via `useSearchParams()`, fetch stays a plain `useEffect` | The row above traded URL-synced search away when the loader went, reasoning that syncing a hook-owned fetch's state to the URL was "a hybrid nobody asked for" — asked for immediately after. `useSearchParams()` only reads/writes the location's query string reactively; it doesn't fetch, doesn't block a navigation, and doesn't bring back anything the loader removal was actually about (the page still mounts and renders `'loading'` immediately, on first entry and on every re-search, same as the row above). `query` is now derived from `searchParams.get('q')` instead of its own `useState`, so it's the single source of truth read on mount (pre-fills the uncontrolled input's `defaultValue` and seeds the first fetch) and written on submit (`setSearchParams(nextQuery ? { q: nextQuery } : {})` — the empty-string branch exists so clearing the search removes `?q=` entirely instead of leaving `?q=` dangling in the URL). `TagListPage.test.tsx` needs a `MemoryRouter` again for this (plain, not the data-router `createMemoryRouter`/`RouterProvider` combo the loader era used — no loader or action here, `useSearchParams` works under any router). |
| `useTagListPage.ts` stopped checking `Session.Missing` / `Authorization.Unauthorized` and redirecting to `/login`; every repository failure now maps to `'error'` the same way | Explicit scope call: a listing hook's job is listing, not deciding what an expired session means for navigation. Checked first whether that redirect was redundant with something else already reacting to it — it wasn't. Grepped the whole app: `apiClient`, `servicesFacade`, `ProtectedRoute`, and `shared/session`'s `sessionMachine`/`sessionStore` were all read end to end, and none of them touch the session store in response to an API call's result; `sessionStore`'s `SessionEvent` union is driven entirely by `oidc-client-ts`'s own `UserManager` events (silent renew, explicit login/logout), never by a 401 or a `Session.Missing` problem code coming back from `services-service`. `ProtectedRoute` only redirects when `shared/session`'s snapshot itself says unauthenticated, so a token that's expired or revoked **at the backend** while the client's own copy still looks valid was, before this change, only ever caught by `useTagListPage`'s own check — the one thing in the entire app that would have sent that person back to `/login`. Removing it without replacing it is a known, accepted gap, not an oversight: a session-invalid response now just renders as the same generic "Não foi possível carregar." every other failure gets, with no redirect and no retry. Fixing that for real needs a shared, reactive handler (e.g. the API layer notifying `shared/session` on a session-invalidating response, so `ProtectedRoute` catches it the way it already catches a dead OIDC session) — cross-cutting, touches `shared/api` and `shared/session`, and deliberately out of scope of a listing hook in one feature slice. Revisit before any other page starts fetching past a session that can go stale mid-visit. |
| Delete alone reintroduced: `/tags/:id/delete` (`TagDeletePage`) mounts over the list via a child-route `<Outlet/>`, the same shape the four-route split used — but with no `route.ts`/loader anywhere in the tree, and no `useRevalidator()` | Deliberately scoped smaller than the row above's split: only delete was asked for this time, not create/edit — `tagsRepository` gained back `delete` (exported name; the function itself is `deleteTag`, since `delete` can't name a function declaration) and `model/tag.ts` gained back `findTagById`, nothing else. A loader was ruled out up front, not re-discovered the hard way — the two rows above already paid for that lesson once. Without a loader there is no `useRouteLoaderData`/`useRevalidator()` to lean on, so the parent hands the child what it needs directly: `TagListPage` renders `<Outlet context={{ tags, reload }}>` (`reload` bumps a `reloadToken` state that's now a second dependency, alongside `query`, on `useTagListPage`'s fetch effect — same "derive `status` by comparing the in-flight request against the last-resolved one" pattern as the row three above, just widened from one key to two), and `TagDeletePage`'s hook reads both back with `useOutletContext()`. `onConfirm` awaits `tagsRepository.delete(tag.id)` and calls `reload()` only on success, before returning the result to `ConfirmDialog` — not from `onSuccess` — so the refetch is already underway by the time `ConfirmDialog` calls `onOpenChange(false)` and the hook navigates back to `/tags`. The loading-vs-not-found race the old loader-backed version never had to face (it blocked until data existed) is handled by the parent, not a third hook state: `TagListPage` only renders the `<Outlet>` once `status === 'ready'`, so a deep link to `/tags/:id/delete` opened cold never flashes "Etiqueta não encontrada" while the list is still on its first fetch — `useTagDeletePage` only ever sees a fully-loaded `tags` array and stays a plain two-mode (`not-found` / `confirming`) result, `TagNotFoundDialog` moved to `TagDeletePage/components/` (single consumer now, not the slice-level `ui/components/` the old two-page version needed). Naming departs from the pre-revert code on purpose: the route, page and hook say **delete**, not **remove** — `agenza-ptbr-copy` reserves "Remover" for taking something out of a list without destroying it (an etiqueta off a serviço) and "Excluir" for destroying the record itself, and reusing "remove" in English identifiers for a destructive op would collide with that the day a real disassociation feature wants the word. `shared/ui/confirm-dialog`'s own defaults (`confirmLabel: 'Excluir'`, `title: 'Confirmar exclusão?'`) already agreed; only the gendered success copy needed overriding (`'Etiqueta excluída'`, not the default masculine `'Excluído com sucesso'` — "etiqueta" is feminine). Create and edit remain out: no `TagFormPage`, no `/tags/new`, no `/tags/:id/edit` — §6 tracks that as the explicit remaining gap. |

---

## 6. Deferred, provisional & not-yet-built

Not everything above is set in stone, and not everything the specs describe is implemented —
because it didn't need to be yet. This is the compiled view across the whole app.

### Provisional — works, but expected to change

- The original scaffold spec (**FR-013**) said the shell must expose _no_ business feature.
  `features/categories/` was added afterwards, deliberately, as a conscious departure from that —
  a harness to have something real calling the backend while the API layer was built and hardened.
  That job is done, and the harness has been removed
  ([ADR 0038](../../../docs/adr/0038-admin-frontend-remove-categories-harness.md)): the app is back
  to a shell with no business feature, aligned with FR-013 again.
- **`src/app/pages/` holds provisional placeholders, not features** — no `model`, no `api`, no
  state beyond what a page's own hook needs (`Services`' keyboard shortcut). Same criterion as the
  `HomePage` it replaces: none of them meet this doc's definition of a slice (§1). Building the
  full shell and all six destinations before any real feature slice exists was
  `specs/002-ui-foundation/`'s explicit scope (D6) — chrome, theme, routing and "Em breve" stubs
  first. Retirement trigger, per page: **the first real feature slice replaces the stub it
  corresponds to** (e.g. a `features/services/` slice replaces `app/pages/Services.tsx` and moves
  under `ui/pages/<Page>/` per §1), once its backend exists.
- **The API layer (`servicesApi`, `apiClient`, `unwrap`, `servicesFacade`, the generated types) stood
  with zero call sites for a while, on purpose — not dead code.** `features/tags/api/tagsRepository.ts`
  is its first real consumer (`specs/003-tags-crud/`); see
  [ADR 0038](../../../docs/adr/0038-admin-frontend-remove-categories-harness.md) for why the layer
  was kept standing in the meantime.

### Deliberately not built — no need yet

| Not built                                                                                                                            | Why not                                                                                                                                                                                                                                        | Build it when                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `entities/` and top-level `pages/` FSD layers                                                                                        | Nothing is shared across features yet                                                                                                                                                                                                          | A second feature needs the same entity or page                                                                                            |
| Server-state library (TanStack Query, SWR)                                                                                           | `features/tags`'s one route proves a plain repository call — from a hook, a loader, or an action, whichever shape the screen needs that week — is enough so far                                                                                | Cross-route caching, refetch-on-focus, or optimistic UI                                                                                   |
| Request-cancellation layer (`AbortController`)                                                                                       | The effect `ignore`-flag already fixes the race; nothing is slow enough to abort on the wire                                                                                                                                                   | Search-as-you-type, a large export                                                                                                        |
| `toDomain(dto)` mappers                                                                                                              | `tagsRepository` forwards `Tag`/`TagResponse` verbatim — no repository has needed one yet                                                                                                                                                      | A wire shape and a domain type genuinely diverge                                                                                          |
| Ports/adapters seam for OIDC (injected `authClient`)                                                                                 | One integration; module-mock in tests is acceptable                                                                                                                                                                                            | A second identity provider, or the mock cost turns real                                                                                   |
| Broad OpenAPI client generation                                                                                                      | `features/tags` calls two `/tags` endpoints (list, delete); the rest of the generated surface (including the other three `/tags` operations the backend still exposes) is unused                                                               | The next business feature is wired                                                                                                        |
| ESLint rule banning bare `fetch` outside `shared/api/`                                                                               | Small surface, caught in review                                                                                                                                                                                                                | The surface grows, or a bare `fetch` slips in                                                                                             |
| Shared handler for a session that goes invalid mid-visit (`Session.Missing` / `Authorization.Unauthorized` from a live API response) | Confirmed end to end: nothing reacts to this today, `ProtectedRoute` included — it only redirects off the OIDC snapshot, which an API 401 never touches (§5 has the audit and why it was removed from `useTagListPage` rather than left there) | A second page starts fetching past a session that can go stale mid-visit — build it once, in `shared/api`/`shared/session`, not per page  |
| `identity-service` typed client                                                                                                      | Consumed purely through the OIDC protocol                                                                                                                                                                                                      | Never — it's protocol, not REST                                                                                                           |
| External telemetry / observability backend                                                                                           | `shared/logger.ts` → `console` is enough                                                                                                                                                                                                       | A real ops requirement appears                                                                                                            |
| Pagination / infinite scroll in `list-section`                                                                                       | `/tags` has no `page`/`pageSize` on the backend yet, and its spec explicitly excludes pagination (small catalog)                                                                                                                               | A second real list screen needs it — `/services` already returns `page`/`pageSize`/`totalCount`, unconsumed today                         |
| `list-section`'s `renderItem` (list, no header) mode exercised by a real screen                                                      | `TagListPage` uses the `columns` mode for its own three-field table                                                                                                                                                                            | A listing without natural columns (e.g. a simple feed or timeline) needs it                                                               |
| Tag create/edit UI (`TagFormPage`, `/tags/new`, `/tags/:id/edit`, `model/tagForm.ts`, the color picker)                              | Only delete was asked for when it came time to reintroduce tag mutation (§5) — create/edit were pulled with the rest of CRUD and haven't been asked for again                                                                                  | Create/edit are explicitly requested — §5's delete-only row has the Outlet-context-without-loader shape and the naming reasoning to reuse |

---

## 7. Toolchain & gates

React 19 · Vite · strict TypeScript (`exactOptionalPropertyTypes`, `verbatimModuleSyntax`,
`noUnusedLocals`) · Tailwind 4 · `react-router` v8 for client-side routing.

CI gates (all must pass): `tsc --noEmit`, ESLint (`recommendedTypeChecked` + `react-hooks` +
`no-explicit-any` as error + `no-restricted-imports` enforcing both the feature barrel and the
`app → features → shared` layer direction), Prettier `--check`,
the Vitest run (CI invokes `test:coverage`, whose `vitest.config.ts` thresholds are a real gate —
85% statements, lines and functions, 80% branches, chosen with headroom so a genuine regression
fails CI without tripping on small-file noise), `generate:api-types:check` (regenerate the
OpenAPI types and fail on drift), and Playwright e2e against the **real** Aspire-orchestrated stack
(a seeded demo login, no mocks).

Unit/component tests use Vitest + React Testing Library with module mocks (`vi.mock` / `vi.hoisted`)
— no network-level mocking. Test files are colocated next to their source.

---

## 8. Pointers

- API wiring, in full — [`specs/001-oidc-shell-scaffold/contracts/api-client-contract.md`](../specs/001-oidc-shell-scaffold/contracts/api-client-contract.md)
- Routes / env contracts — [`contracts/routes-contract.md`](../specs/001-oidc-shell-scaffold/contracts/routes-contract.md), [`contracts/env-contract.md`](../specs/001-oidc-shell-scaffold/contracts/env-contract.md)
- Feature-planning history & the 15 scaffold decisions — [`plan.md`](../specs/001-oidc-shell-scaffold/plan.md), [`research.md`](../specs/001-oidc-shell-scaffold/research.md)
- Backend contracts this app depends on — [ADR 0003](../../../docs/adr/0003-openiddict-identity-service.md) (OIDC), [ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md) (tenant header), [ADR 0005](../../../docs/adr/0005-cqrs-vertical-slice-result-pattern.md) / [ADR 0014](../../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md) (Result pattern)
