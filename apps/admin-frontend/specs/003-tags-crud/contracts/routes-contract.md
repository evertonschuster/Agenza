# Contract: `/tags` Route

Adds two entries to the existing route table (`specs/001-oidc-shell-scaffold/contracts/routes-contract.md`
still governs `/login`, `/callback`, and the authenticated catch-all this nests under).

| Route                | Access                                                                                              | Renders                                        | Notes                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/tags`               | Authenticated (nested under the same `ProtectedRoute`-guarded shell as every other business route)  | `TagListPage` (`features/tags`)                | Reached via the command palette, direct navigation, or the primary-nav destination (spec FR-014).  |
| `/tags/:id/delete`    | Authenticated; nested under `/tags` as a child route                                                | `TagDeletePage` (`features/tags`), over the still-mounted list via `<Outlet/>` | Reached only from a row's "Excluir" link in `TagListPage` (spec FR-009, US4). |

Create and edit were built against this contract (`/tags/new`, `/tags/:id/edit`, a shared
`tagByIdLoader`) and later removed on an explicit scope decision — `docs/ARCHITECTURE.md` §5/§6 has
the history and the current gap. Delete was pulled out in the same decision and came back on its own
afterwards, reusing the child-route-over-`<Outlet/>` shape the original four-route split established,
but without the `route.ts` `loader` that split also tried — `/tags` itself still has no `loader`; it
went through, and backed out of, one twice, most recently because a blocking loader can't show its
own page's loading state (the page doesn't exist yet while the loader runs). `docs/ARCHITECTURE.md`
§5 has the full history. This feature does not add or change any public/unauthenticated route.

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

## `/tags/:id/delete` data contract

No `route.ts` here either — no `loader`, no `action`. `TagListPage` renders `<Outlet
context={{ tags, reload }} />` only once its own `status` is `'ready'`; `TagDeletePage`'s hook
(`useTagDeletePage.ts`) reads that context with `useOutletContext()` and looks `:id` up in `tags`
with `model/tag.ts`'s `findTagById` — no fetch of its own, no shared tag-by-id loader (the earlier
one was built, found obsolete, and removed — `docs/ARCHITECTURE.md` §5).

- **Input**: the `:id` path param, resolved against the list `TagListPage` already loaded.
- **Not-found**: `:id` missing from `tags` (a stale link, or a tag someone else deleted) renders
  `TagNotFoundDialog` instead of the confirm dialog. Gating the `<Outlet>` on `status === 'ready'`
  means this can only mean "genuinely not in the loaded list" — never "list hasn't loaded yet", which
  would otherwise need a third state to rule out.
- **Confirm**: `shared/ui/confirm-dialog`'s `onConfirm` calls `tagsRepository.delete(tag.id)`
  directly — a `Result`, not `unwrapOrThrow`n; a 409 (`Tag.InUse` — spec FR-008) reads as an ordinary
  blocked outcome with the backend's message shown verbatim, not an error boundary.
- **On success**: the outlet-context `reload()` (bumps `useTagListPage`'s `reloadToken`, a second
  dependency on its fetch effect alongside `query`) is called and awaited-in-order **before**
  `ConfirmDialog` calls `onOpenChange(false)`, so the list refetch is already in flight before the
  navigation back to `/tags` fires.
- **Cancel/close**: navigates to `{ pathname: '..', search: location.search }` — the active `?q=`
  search survives closing or completing the dialog either way.

### Contract rules

- `:id` resolution MUST NOT trigger its own fetch — reading the already-loaded list via outlet
  context is the point; a per-tag fetch here would reintroduce the shared tag-by-id loader this
  feature deliberately doesn't bring back.
- A failed delete MUST NOT navigate away or reload the list — only a successful one does either.
- The confirm dialog MUST show the backend's Problem message verbatim (FR-012) — never a rewritten
  or generic string for the blocked case.
