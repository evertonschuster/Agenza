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

`features/tags/ui/pages/TagListPage/route.ts` exports the list's `loader`, re-exported as
`tagListLoader` through the feature's `index.ts` barrel and wired into `app/routes.tsx`'s `lazy: () =>
import('@/features/tags').then((m) => ({ Component: m.TagListPage, loader: m.tagListLoader }))`.

`TagFormPage` (edit mode only) and `TagRemovePage` are each wired to a second, **shared** loader —
`features/tags/ui/pages/tagByIdLoader.ts`, re-exported as `tagByIdLoader` — on their own route
entries (`:id/edit` and `:id/remove`; `/tags/new` has none, since create has no `:id` to load). It
lives outside any single page's folder deliberately: the exact same loader is wired onto both route
entries and belongs to neither `TagFormPage` nor `TagRemovePage` more than the other. Neither route
has an `action` (see below for why).

### `tagListLoader`

- **Input**: the `q` query-string param (`/tags?q=...`), forwarded to `tagsRepository.list(query)`.
- **Behavior**: does **not** `unwrapOrThrow` on an ordinary failure — the app has exactly one
  root-level `errorElement`, so throwing here would blow away the whole shell for a failure
  `shared/ui/list-section`'s `status` contract already handles in-page (`docs/ARCHITECTURE.md` §2).
  It resolves a discriminated `{status:'ready', tags, query} | {status:'error', query}` instead. The
  one case it does throw for is an expired session: `Session.Missing` / `Authorization.Unauthorized`
  → `throw redirect('/login')`, an uncontroversial loader redirect, not an error-boundary case.
- **Returns**: `TagListLoaderData` (the discriminated union above), read only by `TagListPage`'s own
  hook via `useLoaderData()`. Nothing else reads it — see `tagByIdLoader` below for how `TagFormPage`
  (edit mode) and `TagRemovePage` resolve their own tag.

### `tagByIdLoader`

- **Backend**: `GET /api/v{version}/tags/{id}` (`ServicesService.Application/Tags/GetTagById/`,
  `TagsController.GetById`) — added alongside this contract; previously this endpoint didn't exist
  and `TagFormPage`/`TagRemovePage` resolved their tag from the list route's already-loaded data via
  `useRouteLoaderData('tags-list')` instead. That was a workaround for a missing endpoint, not a
  design goal — a search-filtered `/tags?q=...` load has no obligation to contain every tag a stale
  `/tags/:id/edit` link points at, so once the endpoint existed, reading from the list stopped being
  correct and not just impure.
- **Input**: the route's `:id` param, forwarded to `tagsRepository.get(id)`.
- **Behavior**: same non-throwing discipline as `tagListLoader`, extended with a third outcome —
  resolves `{status:'ready', tag} | {status:'not-found'} | {status:'error'}` (`TagLoadResult`,
  `model/tag.ts`; `classifyTagResult` does the `ok`/`Tag.NotFound`/anything-else mapping). Only
  throws `redirect('/login')` for `Session.Missing` / `Authorization.Unauthorized`, identically to
  `tagListLoader`.
- **Returns**: `TagLoadResult`, read via `useLoaderData()` by whichever of `TagFormPage`/`TagRemovePage`
  is mounted. `'not-found'` and `'error'` both render `TagUnavailableDialog` in place of the page's
  normal content (form or confirmation) — `'error'` additionally offers a retry
  (`onRetry` → `useRevalidator().revalidate()`), since a generic fetch failure is recoverable in a way
  a genuinely deleted tag is not.

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
- `tagListLoader`/`tagByIdLoader` MUST NOT `unwrapOrThrow` for an ordinary fetch failure — that would
  defeat `list-section`'s (resp. `TagUnavailableDialog`'s) in-page handling; both MUST
  `throw redirect('/login')` for `Session.Missing` / `Authorization.Unauthorized` specifically, and
  nothing else.
- `TagFormPage`/`TagRemovePage` MUST resolve their target tag from `tagByIdLoader` (a direct
  `GET /tags/{id}` by the route's own `:id`), never from the list route's already-loaded data — the
  only thing these routes may share with `TagListPage` is the `:id` in the URL. A `:id` that resolves
  to no tag (removed by someone else, or simply invalid) MUST render a "não encontrada" state; a
  fetch that fails for any other reason MUST render a distinct, retryable state — neither may crash
  or silently no-op.
