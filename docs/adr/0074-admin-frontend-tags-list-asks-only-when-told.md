# ADR 0074 — admin-frontend: the Etiquetas list pages on `usePaginatedList`, asks the backend only when told to, and keeps its state out of the URL

Status: accepted (2026-10); extends [ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md) (Etiquetas now
pages on the same hook, which gains `refetch`) and follows [ADR 0071](0071-admin-frontend-paged-list-hook.md) (one hook
for the paged lists), [ADR 0072](0072-admin-frontend-paged-list-state-in-the-hook.md) (the state leaves the URL, as
Pessoas' did) and [ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) (cancellation stays with the
consumer); retires the collection adapter of [ADR 0069](0069-tags-collection-compatibility-adapter.md), as that ADR's
retirement trigger said; amended by [ADR 0076](0076-admin-frontend-clients-list-filter-bar.md) (point 10: the search is
a React Hook Form filter bar with `SearchField`, Buscar outside the field and Limpar filtros)

> **2026-10-28 evolution:** [fa07d965](https://github.com/evertonschuster/Agenza/commit/fa07d965a4a2e0f029518a791389812dca54cc25)
> returned applied filters, page and size to the URL for both Pessoas and Etiquetas.
> The page hooks supply controlled state to the Router-independent `usePaginatedList`; the URL
> is read on mount and written with `replace` on the owning route. Point 1's initial-state
> input, point 4, the ignored-URL expectations in point 5, and the URL-related consequences and
> rejected alternatives below record the earlier implementation.
> Requests still leave from actions, mount or correction of a page past the end. `refetch`
> sends the last requested query without an immediate reset, preserving the displayed rows while
> it waits. If the answer puts that page past the end, the usual correction updates the page and
> its URL state. See the [current list convention](../../apps/admin-frontend/docs/ARCHITECTURE.md#1-shape).

## Context

ADR 0073 left Etiquetas as the last list fetching from an effect keyed on state: `useTagListPage` read `?q=` with
`useSearchParams()` and called `fetchTags(query)` from a `useEffect` keyed on it, and a second effect copied `?q=`
into the uncontrolled search field when Back or Forward changed it. The retry and the `tagDeleted` and `tagSaved`
topics already called `fetchTags` directly. On 2026-10-20 the owner asked that no data fetching in the application
be driven by an effect keyed on state, for the reasons ADR 0073 records.

The tags API pages on every request since ADR 0068, but the screen still listed the whole catalog:
ADR 0069 kept `tagsRepository.list(search, signal)` as an adapter that walked every page of 100 and returned one
array, until a frontend change paged the screen. The first version of this decision kept that adapter and gave
`useTagListPage` a `request`/`send` pair of its own, and set paging aside as separate work. Reviewing it on
2026-10-20, the owner asked for Etiquetas to page in the same change, with the pattern Pessoas already uses.

Moving the requests into handlers is not enough while the state lives in the URL: Back and Forward change `?q=`
under a mounted page, and something has to notice, which is the reactive trigger being removed. The owner was asked
to choose between dropping `?q=`, as Pessoas did (ADR 0072), and keeping it with one of the two ways listed under
Considered and rejected, and chose on 2026-10-20 to drop it.

## Decision

1. **Etiquetas runs on `usePaginatedList`, like Pessoas.** `model/tagListFilters.ts` declares `TagListFilters`
   (`search`) and `model/tagList.ts` declares `TagList` (`PagedResult<Tag>`). `useTagListPage` passes the initial
   filters and `tagsRepository.list` to the hook and keeps only the search field's ref and its two handlers. The
   page renders `PaginatedListSection` with the noun "etiqueta"/"etiquetas", so it gets the footer Pessoas has (the
   summary, "Itens por página" with 10, 20, 50 or 100 and 20 by default, the pager), the skeleton with one row per
   item of the page size, and the correction of a page past the end. The search form is `TagListSearch`, beside the
   page, as `ClientListSearch` is, and it caps the field at 254 characters, the `SearchText` limit the API applies.
2. **One request of the hook is one HTTP call.** `tagsRepository.list(query, signal)` sends `Page` and `PageSize`
   always and `Search` only when it is not empty, and returns the API's page as it is, like `clientsRepository.list`.
   A search of only spaces goes out as typed and the API binds it as no search (`BlankIsAbsent`, ADR 0065), so the
   repository does not trim. ADR 0069's adapter, which walked every page, is gone.
3. **`usePaginatedList` gains `refetch()`**, the action the tag topics call: it sends the last requested filters, page
   and size again through the same `send` (so it aborts what is in flight), without the `request` step that clears the
   answer. `request` keeps that query in a ref as it sends it, because `useTopic` only swaps in the latest listener
   after React commits: a topic that lands between an action and that commit would otherwise send the query of the
   render before, abort the action's request and show the old page under the new one's state. The rows and the footer stay on screen until the fresh answer replaces them, as the topics' refetch did
   before, and an answer that finds the page past the end (the last tag of the last page was deleted) is corrected
   to the last page like any other. `useTagListPage` subscribes it with `useTopic(tagSaved, refetch)` and
   `useTopic(tagDeleted, refetch)`. It is still an action, called from a topic's handler at the moment of the
   publish, so the rule of ADR 0073 holds: a request leaves from the mount, an action or the correction of a page
   past the end, and never from an effect keyed on the state.
4. **The search, the page and the size stay out of the URL.** They live in the hook, `?q=` is neither read nor
   written, and the field stays uncontrolled, named `search`, without a `defaultValue`; "Limpar busca" empties it in
   its own handler. "Nova etiqueta", each row's edit and delete links, and the dialogs' close when there is no history
   to go back to stop carrying `location.search`. The dialogs are child routes rendered in the list's `<Outlet>`, so
   the list stays mounted while one is open, and its search, page and size survive opening and closing it.
5. **The tests pin it.** `TagListPage.test.tsx`: one request on mount for the first page of 20 (two under StrictMode,
   the first aborted), none when the page renders again or while typing, exactly one for each action at the moment
   of the action (a search, "Limpar busca", "Tentar novamente", each topic; asserted inside `act`), the abort on the
   next action and on unmount, the rows and the footer kept while a topic refetches, an address carrying `?q=` or
   `?page=` ignored, and the paging (the summary, the footer skeleton, 20 skeleton rows, Próxima keeping the search
   and the size, a size or a search going back to page 1, a saved tag refetching the page on screen with its size, and
   the deletion of the only tag of the last page moving to the page before). `use-paginated-list.test.tsx` pins
   `refetch` on its own. `TagFormPage` and `TagDeletePage` pin that cancelling a dialog leaves the search, the field
   and the rows as they were, with no new request.

## Consequences

- **Etiquetas keeps its search, page and size only on screen.** A reload, a shared link, Back and Forward, and a
  return from another screen start over on the first page of 20 with no search. Accepted by the owner on
  2026-10-20. ARCHITECTURE §1's rule that state a person expects to survive a reload belongs in the URL names both
  lists as the exception.
- Confirming the same search again is a new request, with the skeleton. Clicking Etiquetas in the menu while a
  search is on screen keeps it: the address is already `/tags`. Pessoas behaves the same since ADR 0072.
- **A tag created or renamed appears where the order puts it.** The refetch asks for the page on screen; the API
  orders by name, so a new tag that falls on another page does not show on this one, and the total in the summary
  grows by one. With the whole catalog on one screen it always showed.
- The screen no longer loads the whole filtered catalog: one request per page, bounded by the page size, instead of
  one per 100 tags.
- `refetch` is part of the generic hook. Pessoas does not call it yet; its edit screen (#156) can, when it lands.
- The confirm dialog's "Carregando…" and the footer's summary are both `role="status"` on the same screen now;
  the delete dialog's test looks for its own inside the dialog.
- `TagListSearch` and `ClientListSearch` are the same fifteen lines with a different label; ARCHITECTURE §6 keeps the
  trigger for a shared search form at the third list.
- Spec 003 records the change as two Clarifications of 2026-10-20 and FR-019, moves paging out of Out of Scope, and
  its routes contract describes the paged call.
- Still fetched from an effect keyed on state, and outside this decision because it is not a list: the tag the
  edit and delete dialogs load by `:id` (`useTagFormPage`, `useTagDeletePage`), keyed on the route parameter.

## Considered and rejected

- **Keeping ADR 0069's adapter and a `request`/`send` pair inside `useTagListPage`** (the first version of this
  decision). It removed the effect, but left a second copy of the hook's abort-and-answer logic beside
  `usePaginatedList` and the screen loading every tag. Superseded by the owner's request to page now.
- **The topics calling the retry, or `applyFilters({})`.** The retry clears the answer, so every save or delete would
  flash the skeleton under the closing dialog; `applyFilters` also starts over on page 1, so editing a tag on page 3
  would throw the person back to the first page.
- **Naming the action `reload`**, as the first version of this decision did. Beside `onRetry`, which asks for the
  same query, it did not say what sets the two apart (the rows stay on screen), and it reads like reloading the page,
  the start-over this action avoids. Renamed by the owner on 2026-10-20 to `refetch`, TanStack Query's name for
  asking the same query again while the data on screen stays. React Router's `revalidate` fits the after-a-mutation
  case too, but is more jargon and recalls the automatic revalidation ADR 0073 turned down.
- **Keeping `?q=`, written with `replace` and read once on mount.** A reload and a shared link would keep the
  search, and with no history entry per search Back leaves Etiquetas instead of changing `?q=` under the page. But
  the URL becomes a mirror the list does not follow: the menu's link to `/tags`, clicked during a search, would
  change the address and leave the rows of the search on screen. Turned down by the owner.
- **Keeping `?q=` and Back walking through searches, through a `popstate` listener** subscribed by the mount
  effect, like `useTopic`. It keeps everything the URL gave, but reads `window.location` beside the router, and a
  navigation to `/tags` that is not a Back or Forward still goes unnoticed. Turned down by the owner.
- **A `loader` on the route.** The router asks on every navigation, Back included, and aborts the one it replaces,
  but a blocking loader hides the list's skeleton (the reason it was backed out twice, ARCHITECTURE §5), and a
  deferred one needs the Suspense restructuring ADR 0073 set aside.
