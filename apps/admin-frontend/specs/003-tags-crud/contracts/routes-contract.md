# Contract: `/tags` Route

Adds one entry to the existing route table (`specs/001-oidc-shell-scaffold/contracts/routes-contract.md`
still governs `/login`, `/callback`, and the authenticated catch-all this nests under).

| Route   | Access                                                                                             | Renders                     | Notes                                                            |
| ------- | --------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `/tags` | Authenticated (nested under the same `ProtectedRoute`-guarded shell as every other business route) | `TagListPage` (`features/tags`) | Reached via the command palette, direct navigation, or the primary-nav destination (spec FR-014). |

Create, edit and delete were built against this contract (`/tags/new`, `/tags/:id/edit`,
`/tags/:id/remove`, their own pages, and a shared `tagByIdLoader`) and later removed — `/tags` only
lists today. This route also went through, and backed out of, a `route.ts` `loader` twice — most
recently because a blocking loader can't show its own page's loading state (the page doesn't exist
yet while the loader runs). `docs/ARCHITECTURE.md` §5 has the full history for both. This feature
does not add or change any public/unauthenticated route.

## Data contract

`/tags` has no `route.ts`, no `loader`, and no `action`. `TagListPage`'s own hook
(`useTagListPage.ts`) calls `tagsRepository.list(query)` directly from a `useEffect`, keyed on the
submitted search query.

- **Input**: the `q` URL search param (`/tags?q=...`), read and written via `useSearchParams()` — not
  a `useState`. Submitting the search form sets it (dropping the param entirely when the field is
  cleared, rather than leaving `?q=` empty); loading `/tags?q=...` directly pre-fills the field and
  seeds the first fetch with it.
- **Behavior**: never `unwrapOrThrow`s — a repository failure resolves as `status: 'error'` in the
  hook's own state, rendered in-page by `shared/ui/list-section` (`docs/ARCHITECTURE.md` §2), **every**
  failure treated alike. This hook deliberately does not special-case `Session.Missing` /
  `Authorization.Unauthorized` or redirect anywhere — a listing hook's job is listing, not session
  lifecycle. That is a known, accepted gap, not a claim that something else catches it: nothing else
  in the app reacts to those two codes today (`docs/ARCHITECTURE.md` §5/§6 has the audit trail).
- **Loading**: `status` is derived by comparing the query currently in flight against the last one a
  response resolved for, not stored as its own `setState` — true for both the first fetch on mount
  and every re-search, so `list-section`'s loading skeleton actually shows both times. An `ignore`
  flag in the effect's cleanup discards a stale response if a newer search has since superseded it.

## Contract rules

- No tenant identifier appears in any `/tags` path or in the search request — tenant scoping is
  entirely the existing `apiClient` middleware's job (constitution Principle II).
- The list fetch MUST NOT `unwrapOrThrow` for an ordinary failure — that would defeat
  `list-section`'s in-page handling. It MUST NOT branch on the failure's code either, session-related
  or otherwise — every failure renders the same generic `'error'` state.
- A response for a superseded search MUST NOT overwrite a newer one still in flight or already
  resolved.
