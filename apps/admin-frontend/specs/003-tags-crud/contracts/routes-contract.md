# Contract: `/tags` Route

Adds one entry to the existing route table (`specs/001-oidc-shell-scaffold/contracts/routes-contract.md`
still governs `/login`, `/callback`, and the authenticated catch-all this nests under).

| Route   | Access                                                                                             | Renders                     | Notes                                                            |
| ------- | --------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `/tags` | Authenticated (nested under the same `ProtectedRoute`-guarded shell as every other business route) | `TagListPage` (`features/tags`) | Reached via the command palette, direct navigation, or the primary-nav destination (spec FR-014). |

Create, edit and delete were built against this contract (`/tags/new`, `/tags/:id/edit`,
`/tags/:id/remove`, their own pages, and a shared `tagByIdLoader`) and later removed — `/tags` only
lists today. `docs/ARCHITECTURE.md` §5 has the full history, including why the removed pieces came
out entirely instead of staying as unreferenced code. This feature does not add or change any
public/unauthenticated route.

## `route.ts` data contract

`features/tags/ui/pages/TagListPage/route.ts` exports the list's `loader`, re-exported as
`tagListLoader` through the feature's `index.ts` barrel and wired into `app/routes.tsx`'s `lazy: () =>
import('@/features/tags').then((m) => ({ Component: m.TagListPage, loader: m.tagListLoader }))`.
No other route in this slice exists, so there is no second loader and no `action`.

### `tagListLoader`

- **Input**: the `q` query-string param (`/tags?q=...`), forwarded to `tagsRepository.list(query)`.
- **Behavior**: does **not** `unwrapOrThrow` on an ordinary failure — the app has exactly one
  root-level `errorElement`, so throwing here would blow away the whole shell for a failure
  `shared/ui/list-section`'s `status` contract already handles in-page (`docs/ARCHITECTURE.md` §2).
  It resolves a discriminated `{status:'ready', tags, query} | {status:'error', query}` instead. The
  one case it does throw for is an expired session: `Session.Missing` / `Authorization.Unauthorized`
  → `throw redirect('/login')`, an uncontroversial loader redirect, not an error-boundary case.
- **Returns**: `TagListLoaderData` (the discriminated union above), read only by `TagListPage`'s own
  hook via `useLoaderData()`.

## Contract rules

- No tenant identifier appears in any `/tags` path or in `tagListLoader`'s params — tenant scoping is
  entirely the existing `apiClient` middleware's job (constitution Principle II).
- `tagListLoader` MUST NOT `unwrapOrThrow` for an ordinary fetch failure — that would defeat
  `list-section`'s in-page handling; it MUST `throw redirect('/login')` for `Session.Missing` /
  `Authorization.Unauthorized` specifically, and nothing else.
