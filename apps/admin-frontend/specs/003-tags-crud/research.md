# Phase 0 Research: Service Tags CRUD

## Decision 1 — No backend/contract work needed

**Decision**: Treat this as a pure frontend feature. Do not touch `services-service` or run
`npm run generate:api-types`; only run the existing `generate:api-types:check` drift gate.

**Rationale**: `src/shared/api/generated/services-api.d.ts` already declares
`'/api/v{version}/tags'` (GET list, POST create) and `'/api/v{version}/tags/{id}'` (PUT update,
DELETE), plus `TagResponse`/`CreateTagCommand`/`UpdateTagCommand` schemas — verified by grep against
the generated file this session. `services-service`'s `TagsController` and `Tag` domain entity are
fully built and covered by 75 passing backend tests (run this session).

**Alternatives considered**: Regenerating the client anyway "just in case" — rejected as
unnecessary churn; `generate:api-types:check` already exists specifically to catch drift, so it's the
right Setup-phase task instead.

## Decision 2 — Data fetching: route `loader`, fetched once, filtered client-side

**Decision**: `TagsPage`'s data comes from a React Router `loader` (`route.ts`) that calls
`tagsRepository.list()` once per navigation to `/tags`. The search box (FR-002) filters the
already-loaded array in `useTagsPage.ts` — no per-keystroke request, no debounce.

**Rationale**: Spec Assumptions fix the catalog at "small (dezenas a poucas centenas)" with no
pagination, matching the backend's own unpaginated `ListTagsQuery`. The constitution still defers
"whether a server-state library is used, and which" — introducing one (TanStack Query, SWR, …) for a
single small, infrequently-changing list would be exactly the premature complexity
[[prefers-minimal-plumbing]] warns against. `loader` + React Router's automatic revalidation after an
`action` (create/update/delete) already keeps the list correct without extra machinery.

**Alternatives considered**: Server-side search (`GET /tags?search=`) per keystroke — the backend
supports it (`ListTagsQuery(string? Search)`, case-insensitive `ILIKE`), so this is a legitimate
future option if the catalog grows past "small," but there's no evidence that's true today and it
would add debounce/race-handling complexity for no current benefit.

## Decision 3 — Mutations as router `action`s, not local state + manual refetch

**Decision**: Create/update/delete all go through one `tagsAction` in `route.ts`, dispatched via
`useFetcher()` from the dialogs (not a full-page `<Form>` navigation — the list must stay visible
behind an open dialog). The action reads an `intent` field from the submitted `FormData` to branch
between the three operations, calls the matching `tagsRepository` method, and returns its
`ApiResult<Tag>` (or `ApiResult<void>` for delete) **unmodified** — per `AGENTS.md`: "Em `action` e
mutação o `Result` passa direto." `unwrapOrThrow` is never called in the action.

**Rationale**: Matches the already-prescribed `loader`/`action`-per-route convention and keeps a
single request/response shape the dialogs read via `fetcher.data`, instead of hand-rolled
`useState`/`try-catch` per dialog.

## Decision 4 — One new `shared/ui` primitive: a generic color-swatch picker

**Decision**: Add `shared/ui/color-swatch-picker.tsx` — takes `options: {value, label}[]` and a
selected value, renders as a `role="radiogroup"` of swatch buttons. It has no knowledge of Tags or
of the specific 8 hex values; those stay in `features/tags/model/tag.ts`. Build it through the
`agenza-ui-primitive` skill (its own trigger list names exactly this: "rendering a backend-supplied
tag colour," "deciding whether a control gets a resting keycap") rather than deciding its final
shape unilaterally here.

**Rationale**: `shared/ui/` is explicitly for cross-cutting, business-rule-free UI (`AGENTS.md`); a
fixed-option swatch picker qualifies, the same way `Badge`/`Button` do. The *display* side (rendering
an existing tag as a colored chip) needs no new component at all — `app/globals.css`'s `.tag` class
already exists for exactly this (`color-mix(in oklab, var(--tag) …)`), unused until now; reuse it
verbatim via a thin wrapper rather than reinventing chip styling.

**Alternatives considered**: Keeping the swatch picker feature-local (`features/tags/ui/`) since only
Tag has a color today — rejected because the control itself carries no Tag business rule (it's "N
labeled swatches, pick one"), and `shared/ui` is exactly where the codebase already put the other
half of this same concern (`.tag`).

## Decision 5 — Client-side field validation is a UX nicety, not the source of truth

**Decision**: `features/tags/model/tagForm.ts` pre-checks only what's cheap and unambiguous locally —
name required / ≤40 chars, description ≤200 chars — purely to avoid a pointless round-trip. It does
**not** attempt to replicate name-uniqueness (requires the server) or color validity (the picker only
ever offers the 8 real values, so an invalid color can't be constructed through the UI). All of it is
superseded by whatever the backend actually returns (spec FR-012 /
[[feedback-show-backend-error-messages-verbatim]]) — the same message text renders either way.

**Rationale**: Keeps validation logic in exactly one place conceptually (the backend), with the
client-side copy existing only as latency-avoidance, never a second source of truth to keep in sync.

## Decision 6 — `TagsRepository`: hand-written domain type, verbatim forward

**Decision**: `features/tags/model/tag.ts` declares `interface Tag { id: string; name: string;
color: string; description: string | null }` by hand (not `components['schemas']['TagResponse']`
directly). `tagsRepository.ts` forwards `servicesApi` calls verbatim — no `toDomain` mapper — since
`TagResponse` and `Tag` are already structurally identical.

**Rationale**: Matches the project's established repository shape (`AGENTS.md`): hand-written domain
types decouple feature code from OpenAPI-generated names, add a mapper only the day wire ≠ domain.

## Decision 7 — Command palette entry, deliberately not a `NAV_DESTINATIONS` entry

**Decision**: Add one item to `app/shell/CommandPalette.tsx`'s command list, structurally separate
from the `NAV_DESTINATIONS`-derived "Ir para" group (`navigation.ts` stays unchanged, still exactly
the 6 fixed destinations powering `SidebarNav`/`BottomNav`).

**Rationale**: Directly implements spec FR-014 — reachable only through the command palette, no new
sidebar/bottom-nav icon. Confirmed against the live `CommandPalette.tsx` source this session: today
its groups are "Ir para" (`NAV_DESTINATIONS.map(...)`), "Tema," "Outros" — Tags becomes a fourth,
one-item group (or joins "Outros"; a tasks-time call, not a plan-level one).

## Decision 8 — e2e "tag in use" scenario needs a new fixture-seeding helper

**Decision**: `e2e/tags.spec.ts`'s tag-in-use-blocks-delete scenario (spec FR-008, SC-003) cannot be
set up through the UI — there is no Services-creation screen yet (Out of Scope, and genuinely absent
from the app today). Add a small helper (`e2e/helpers.ts` or a new `e2e/fixtures.ts`) that creates a
tag and a service referencing it via a direct authenticated API call before the test drives the UI,
following the existing `loginAsDemoUser` helper's pattern for reaching the demo tenant.

**Rationale**: Named explicitly because it's the one non-obvious risk in an otherwise
low-risk plan — without it, FR-008/SC-003 would end up under-tested (unit/handler-level coverage
already exists backend-side, but the frontend's own blocked-delete UI path needs an e2e proof too).

**Alternatives considered**: Skipping e2e coverage for the blocked-delete path and relying on a
component/unit test with a mocked `ApiResult` conflict response — weaker (doesn't prove the real
`DeleteTagCommandHandler` → frontend round trip), kept as a *complement* in tasks.md, not a
replacement.
