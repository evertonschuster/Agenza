# Contract: `/tags` Route Tree

Adds four entries to the existing route table (`specs/001-oidc-shell-scaffold/contracts/routes-contract.md`
still governs `/login`, `/callback`, and the authenticated catch-all this nests under). This
supersedes the single-route version of this contract — the app's first nested route tree, driven by
segregating list/create/edit/delete into independent pages that don't share a hook or a `dialog`
state union (see `docs/ARCHITECTURE.md` §5 for the full rationale and history).

| Route | Access | Renders | Notes |
|---|---|---|---|
| `/tags` | Authenticated (nested under the same `ProtectedRoute`-guarded shell as every other business route) | `TagListPage` (`features/tags`) | Reached via the command palette, direct navigation, or the primary-nav destination (spec FR-014). Renders the list **and** an `<Outlet/>` — the three routes below mount their dialog on top of it, list still visible underneath. |
| `/tags/new` | Same, nested under `/tags` | `TagFormPage` (create mode) | Dialog over the list. Cancel or a successful save both return to `/tags`. |
| `/tags/:id/edit` | Same, nested under `/tags` | `TagFormPage` (edit mode) | Same component as `/tags/new` — mode is decided by whether `:id` is present, not by a separate page. |
| `/tags/:id/remove` | Same, nested under `/tags` | `TagRemovePage` | Confirmation dialog over the list, wrapping the shared `ConfirmDialog` primitive. |

This feature does not add or change any public/unauthenticated route.

## `route.ts` data contract

Only `TagListPage` has a `route.ts` — `features/tags/ui/pages/TagListPage/route.ts` exports a
`loader` only, re-exported as `tagListLoader` through the feature's `index.ts` barrel and wired into
`app/routes.tsx`'s `lazy: () => import('@/features/tags').then((m) => ({ Component: m.TagListPage,
loader: m.tagListLoader }))`. `TagFormPage` and `TagRemovePage` have **no** `route.ts` — no loader (they
read the already-loaded list via `useRouteLoaderData('tags-list')`, keyed by the route id set on the
`/tags` route object) and no `action` (see below for why).

### `tagListLoader`

- **Input**: the `q` query-string param (`/tags?q=...`), forwarded to `tagsRepository.list(query)`.
- **Behavior**: does **not** `unwrapOrThrow` on an ordinary failure — the app has exactly one
  root-level `errorElement`, so throwing here would blow away the whole shell for a failure
  `shared/ui/list-section`'s `status` contract already handles in-page (`docs/ARCHITECTURE.md` §2).
  It resolves a discriminated `{status:'ready', tags, query} | {status:'error', query}` instead. The
  one case it does throw for is an expired session: `Session.Missing` / `Authorization.Unauthorized`
  → `throw redirect('/login')`, an uncontroversial loader redirect, not an error-boundary case.
- **Returns**: `TagListLoaderData` (the discriminated union above), read by `TagListPage`'s own hook
  via `useLoaderData()`, and by `TagFormPage`/`TagRemovePage` via `useRouteLoaderData('tags-list')` to
  resolve which tag they're acting on (`findTagById`, `model/tag.ts`) — the backend has no
  single-tag `GET`, so this is the only source for "the tag behind this `:id`" short of a second,
  redundant fetch.

### Mutations: no `action`, direct repository calls + explicit revalidation

`TagFormPage` (both modes) and `TagRemovePage` call `tagsRepository.create` / `.update` / `.remove`
**directly** from their own hook — the same pattern `useTagsPage.ts` used before this split, just
now one hook per operation instead of one hook for all three. On success, each hook calls
`useRevalidator().revalidate()` before navigating back to `/tags`, so `tagListLoader` re-runs and the
list reflects the change without a manual refetch. This is a deliberate choice over a real `action` +
`redirect()` (which would revalidate automatically, no explicit call needed): `shared/ui/confirm-dialog`
was built specifically to **not** be fetcher/action-shaped (`docs/ARCHITECTURE.md` §5), and routing
`TagFormPage`'s submit through `useSubmit()`/`<Form>` + an `action` would reintroduce the
`useFetcher`+`useEffect` shape a previous revert (`5e48593`) removed — judged a bigger diff than one
explicit `revalidate()` call per hook is worth.

- **Input** (in-memory, not `FormData`): `TagFormValues` for create/update (`model/tagForm.ts`); just
  the route's `:id` param for remove.
- **Behavior**: the hook validates client-side first (`validateTagForm`), then calls the repository
  method and reads the `ApiResult<T>` **without unwrapping** — a 400/409 is expected flow (spec
  FR-012), rendered inline in the still-open dialog, not routed to an error boundary.
- **Returns**: nothing route-visible — the hook holds the result in local state
  (`tagFormErrorsFromResult`, `model/tagForm.ts`) to decide what to render: `result.error.errors['']`
  for a general/banner message (duplicate name, in-use, not-found), `result.error.errors[<field>]` to
  place a message under that specific form field, both rendered verbatim (spec FR-012).

## Contract rules

- No tenant identifier appears in any `/tags*` path, in `tagListLoader`'s params, or in any
  submitted form value — tenant scoping is entirely the existing `apiClient` middleware's job
  (constitution Principle II).
- A create/update/remove call MUST NOT call `unwrapOrThrow` on its result — doing so would turn an
  expected 409 (duplicate name / tag in use) or 404 (not found) into a thrown error instead of the
  inline UI spec FR-004/FR-008/FR-012 require.
- `tagListLoader` MUST NOT `unwrapOrThrow` for an ordinary list-fetch failure — that would defeat
  `list-section`'s in-page `status: 'error'` handling; it MUST `throw redirect('/login')` for
  `Session.Missing` / `Authorization.Unauthorized` specifically.
- `TagFormPage`/`TagRemovePage` MUST resolve their target tag from `useRouteLoaderData('tags-list')`,
  never by re-fetching — the backend has no single-tag `GET` to re-fetch from. A `:id` that resolves
  to no tag (removed by someone else, filtered out by an active search, or simply invalid) MUST render
  a "não encontrada" state, never crash or silently no-op.
