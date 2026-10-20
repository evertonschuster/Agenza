# ADR 0074 — admin-frontend: the Etiquetas list asks the backend only when told to, with its search out of the URL

Status: accepted (2026-10); extends [ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md) (its rule now
covers Etiquetas, whose screen does not page) and follows [ADR 0072](0072-admin-frontend-paged-list-state-in-the-hook.md)
(the search leaves the URL, as Pessoas' did) and [ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md)
(cancellation stays with the consumer)

## Context

ADR 0073 left Etiquetas as the last list fetching from an effect keyed on state: `useTagListPage` read `?q=` with
`useSearchParams()` and called `fetchTags(query)` from a `useEffect` keyed on it, and a second effect copied `?q=`
into the uncontrolled search field when Back or Forward changed it. The retry and the `tagDeleted` and `tagSaved`
topics already called `fetchTags` directly. On 2026-10-20 the owner asked that no data fetching in the application
be driven by an effect keyed on state, for the reasons ADR 0073 records.

Moving the submit into its handler is not enough while the search lives in the URL: Back and Forward change `?q=`
under a mounted page, and something has to notice, which is the reactive trigger being removed. The owner was asked
to choose between dropping `?q=`, as Pessoas did (ADR 0072), and keeping it with one of the two ways listed under
Considered and rejected, and chose on 2026-10-20 to drop it.

## Decision

1. **`useTagListPage` keeps the search in a `useState` of its own**, starting empty. It imports nothing from
   `react-router`, and `?q=` is neither read nor written. The field stays uncontrolled, without a `defaultValue`,
   and is named `search`; "Limpar busca" empties it in its own handler, as in Pessoas.
2. **A request leaves from the mount, an action or a tag topic, and only one is in flight.** `send(query)` aborts
   the request in flight, held in a ref as an `AbortController`, and asks; an answer whose signal was aborted is
   dropped. The search, "Limpar busca" and "Tentar novamente" go through `request(next)`, which sets the search,
   clears the answer so the skeleton shows, and sends, in the handler's own call stack. `tagSaved` and `tagDeleted`
   call `send(query)` directly, so the rows stay on screen until the fresh answer replaces them, as they did before.
3. **The first search is sent by an effect with no dependencies**, through `useEffectEvent`, and unmounting aborts
   what is in flight. Under StrictMode, in development only, it runs twice and the first request is aborted.
4. **The answer is the `ApiResult` itself**, no longer tagged with the query it was for: `status` is loading while
   there is none, and the abort already ensures the one held is the latest (ADR 0073 point 2). `LoadResult` is gone.
5. **The links stop carrying `location.search`**: "Nova etiqueta", each row's edit and delete links, and the
   dialogs' close when there is no history to go back to. The dialogs are child routes rendered in the list's
   `<Outlet>`, so the list stays mounted while one is open and the search on screen survives opening and closing it
   without the URL. `newTagTo` is gone; the page links to `new`.
6. **The tests pin the rule** in `TagListPage.test.tsx`: one request on mount (two under StrictMode, the first
   aborted), none when the page renders again or while typing, exactly one for each action and at the moment of the
   action (a search, "Limpar busca", "Tentar novamente", each topic; asserted inside `act`, before React renders),
   the request in flight aborted by the next action and on unmount, the rows kept on screen while a topic reloads
   them, and an address carrying `?q=` ignored. The search test inside `act` fails against the hook with the effect.
   `TagFormPage` and `TagDeletePage` pin that cancelling a dialog leaves the search, the field and the rows as they
   were, with no new request.

## Consequences

- **Etiquetas keeps its search only on screen.** A reload or a shared link opens the whole catalog, Back and
  Forward no longer walk through searches, and leaving for another screen and coming back starts over. Accepted by
  the owner on 2026-10-20. ARCHITECTURE §1's rule that state a person expects to survive a reload belongs in the URL
  now names both lists as the exception.
- Confirming the same search again is a new request, with the skeleton; before, the URL did not change and nothing
  happened. Clicking Etiquetas in the menu while a search is on screen now keeps it: the address is already `/tags`,
  where before it dropped `?q=` and the effect reloaded everything. Pessoas behaves the same since ADR 0072.
- Spec 003 records the change as a Clarification of 2026-10-20, and its routes contract no longer describes `?q=`.
- The rule now covers both lists, and the admin-frontend `AGENTS.md` says so: a new action on either hook goes
  through its `request`, and changing the state alone asks for nothing.
- One request of the hook is one call to `tagsRepository.list(search, signal)`, which ADR 0069 keeps as a
  collection adapter over the paged API: it may make several HTTP calls, one per 100 tags, all under the same
  signal, so an abort stops the walk at the page in flight. The tests count repository calls.
- Still fetched from an effect keyed on state, and outside this decision because it is not a list: the tag the
  edit and delete dialogs load by `:id` (`useTagFormPage`, `useTagDeletePage`), keyed on the route parameter.
- Not checked in the owner's running stack, which serves the main checkout; the page's tests drive the same clicks
  over a mocked repository.

## Considered and rejected

- **Keeping `?q=`, written with `replace` and read once on mount.** A reload and a shared link would keep the
  search, and with no history entry per search Back leaves Etiquetas instead of changing `?q=` under the page. But
  the URL becomes a mirror the list does not follow: the menu's link to `/tags`, clicked during a search, would
  change the address and leave the rows of the search on screen. Turned down by the owner.
- **Keeping `?q=` and Back walking through searches, through a `popstate` listener** subscribed by the mount
  effect, like `useTopic`. It keeps everything the URL gave, but reads `window.location` beside the router, adds
  plumbing to a list that does not page, and a navigation to `/tags` that is not a Back or Forward still goes
  unnoticed. Turned down by the owner.
- **A `loader` on the route.** The router asks on every navigation, Back included, and aborts the one it replaces,
  but a blocking loader hides the list's skeleton (the reason it was backed out twice, ARCHITECTURE §5), and a
  deferred one needs the Suspense restructuring ADR 0073 set aside.
- **Running Etiquetas on `usePaginatedList` now.** The tags API pages since ADR 0068, but the screen still lists
  the whole catalog through ADR 0069's adapter, and paging it (the footer, the page and the size, a page contract in
  the repository) is the separate frontend feature that retires that adapter. This decision changes neither; when
  that feature lands, Etiquetas moves onto `usePaginatedList`, which already follows the same rule.
