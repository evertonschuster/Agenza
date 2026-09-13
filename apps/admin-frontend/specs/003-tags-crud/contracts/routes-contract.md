# Contract: `/tags` Route

Adds one entry to the existing route table (`specs/001-oidc-shell-scaffold/contracts/routes-contract.md`
still governs `/login`, `/callback`, and the authenticated catch-all this nests under).

| Route | Access | Renders | Notes |
|---|---|---|---|
| `/tags` | Authenticated (nested under the same `ProtectedRoute`-guarded shell as every other business route) | `TagsPage` (`features/tags`) | Reached only via the command palette or direct navigation (spec FR-014) — no sidebar/bottom-nav icon, no link from `/servicos`. |

This feature does not add or change any public/unauthenticated route.

## `route.ts` data contract

`features/tags/ui/pages/TagsPage/route.ts` is the single place `loader`/`action` are defined,
re-exported through the feature's `index.ts` barrel and wired into `app/routes.tsx`'s existing
`lazy: () => import('@/features/tags').then((m) => ({ Component: m.TagsPage, loader: m.tagsLoader,
action: m.tagsAction }))` — React Router's `lazy` already supports returning `loader`/`action`
alongside `Component` from one dynamic import; no change to how `routes.tsx` is structured otherwise.

### `tagsLoader`

- **Input**: none (no path/query params on `/tags`).
- **Behavior**: calls `tagsRepository.list()`, then `unwrapOrThrow` at this boundary (`AGENTS.md`: the
  loader/`queryFn` boundary is where `Result` becomes a rejection) — a failure throws
  `ApiProblemError`, caught by the existing route-level `errorElement` (`AppRouteError`).
- **Returns**: `Tag[]`.

### `tagsAction`

- **Input**: a submitted `FormData` with an `intent` field of `'create' | 'update' | 'delete'`, plus:
  - `create`: `name`, `color`, `description` (may be empty string → sent as `null`)
  - `update`: `id`, `name`, `color`, `description`
  - `delete`: `id`
- **Behavior**: branches on `intent`, calls the matching `tagsRepository` method, and returns its
  `ApiResult<Tag>` (create/update) or `ApiResult<void>` (delete) **without unwrapping** — a 400/409
  is expected flow here, not an error boundary (`AGENTS.md`; spec FR-012). Successful mutations rely
  on React Router's automatic revalidation of `tagsLoader` after the action settles — no manual
  refetch.
- **Returns**: the raw `ApiResult<T>`, read by the calling dialog via `useFetcher().data` to decide
  what to render — `result.error.errors['']` for a general/banner message (duplicate name, in-use,
  not-found), `result.error.errors[<field>]` to place a message under that specific form field, both
  rendered verbatim (spec FR-012).

## Contract rules

- No tenant identifier appears in the `/tags` path, in `tagsLoader`'s params, or in any submitted
  `FormData` field — tenant scoping is entirely the existing `apiClient` middleware's job
  (constitution Principle II).
- `tagsAction` MUST NOT call `unwrapOrThrow` — doing so would turn an expected 409 (duplicate name /
  tag in use) into a thrown error and route to the error boundary instead of the inline UI spec
  FR-004/FR-008/FR-012 require.
- `tagsLoader` MUST call `unwrapOrThrow` — an unexpected list-fetch failure has no sensible inline
  treatment and should fall through to the existing route error boundary, consistent with every other
  `loader` this codebase will add.
