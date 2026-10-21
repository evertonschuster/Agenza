# ADR 0073 — admin-frontend: a paged list asks the backend only when told to

Status: accepted (2026-10); amends [ADR 0072](0072-admin-frontend-paged-list-state-in-the-hook.md) (points 1 to 3:
no effect keyed on the state, and the correction of a page past the end leaves the render) and
[ADR 0071](0071-admin-frontend-paged-list-hook.md) (point 1: `setFilters` becomes `applyFilters`); follows
[ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) (cancellation stays with the consumer) and
[ADR 0035](0035-admin-frontend-no-server-state-library.md); extended by
[ADR 0074](0074-admin-frontend-tags-list-asks-only-when-told.md) (Etiquetas pages on the same hook, which gains `refetch`
for the tag topics, with its state out of the URL)

## Context

After ADR 0072, `usePaginatedList` kept the filters, the page and the size in a `useState` and fetched from a
`useEffect` keyed on that state. From the page the call was already explicit (the submit called `setFilters`), but
the request left because the state had changed, in an effect, after the render. On 2026-10-20 the owner asked that
fetching stop being reactive inside the hook: in a previous job they met the bugs that come with it (an effect
depending on an object or a function made again on every render, a refetch when unrelated state moves, the same
request twice, an older answer landing over a newer one) and wanted this application to leave no opening for them.
The hook defended against each of those (an abort per request, the state changed only through `setQuery`), but
through an invariant a later edit could break without any test failing.

The owner asked for the alternatives to be researched before choosing. React's own guidance is the deciding line:
logic caused by an interaction belongs in the event handler, and an effect is for what has to happen because a
component is on screen.

## Decision

1. **A request leaves from three places only: an action, the mount, and the correction of a page past the end.**
   Every action (`applyFilters(patch)`, which was `setFilters`, `onPageChange`, `onPageSizeChange` and the retry)
   goes through one `request(next)`, which sets the query, clears the answer and sends at once, in the action's own
   call stack.
2. **One request in flight at a time.** `send(next)` aborts the request in flight, held in a ref as an
   `AbortController`, before the next one leaves, and an answer whose signal was aborted is dropped, so only the
   latest answer reaches the screen. The answer is no longer tagged with its query (ADR 0072 point 2): the abort
   already ensures it is the current one. Unmounting aborts what is in flight.
3. **The first page is asked for by an effect with no dependencies**, through `useEffectEvent`. It reacts to no state
   and no prop, so no render can turn into another request. It sets no state itself (the state starts as loading),
   which keeps `react-hooks/set-state-in-effect` satisfied. Under StrictMode, in development only, it runs twice and
   the first request is aborted.
4. **A page past the last one is corrected where the answer arrives**: the total is kept for those filters and the
   last page is requested explicitly, instead of adjusting the state during render.
5. **The tests pin the rule**: one request on mount (two under StrictMode, the first aborted), none when the hook
   renders again with other options, exactly one per action and at the moment of the action (asserted inside `act`,
   before React renders, which fails against the hook with the effect), the request in flight aborted by the next
   action and on unmount, and only the latest answer on screen.

## Consequences

- Pessoas changes only the name it calls: `applyFilters({ search })`.
- `PaginatedListAnswer` is gone; the total is still kept per filters object, so a change of page or size keeps the
  footer while the next page loads and a new search draws its skeleton.
- A new action on the hook must go through `request`: changing the state alone asks for nothing.
- Etiquetas still fetches from an effect keyed on `?q=`. It does not page and is outside this decision.
- Checked in the owner's running stack: one request on load, none while typing in the search field, one for a search
  and one for Próxima with the search kept, the last of two quick page clicks on screen with the other request shown
  by the browser as aborted, and the address left as `/pessoas`.

## Considered and rejected

Researched on 2026-10-20.

- **React Router's `useFetcher().load()`.** The router cancels a fetcher's previous load, but the hook would depend on
  the Router again, with the filters as string parameters, and fetchers revalidate on their own after any action,
  which is the refetch this decision removes.
- **A promise in state read with `use()` under Suspense.** The only option with no effect at all, but the skeleton
  becomes a Suspense fallback and the footer's last total has to live outside the boundary: a restructuring of the
  list that deserves a prototype of its own.
- **TanStack Query or SWR.** Both fetch on their own by default (on a key change, on focus, on reconnect); TanStack's
  documentation discourages a permanently disabled query, and its `refetch` takes no parameters. A server-state library
  was already turned down (ADR 0035).
- **An external store read with `useSyncExternalStore`.** The fetching would be testable without React, but it is
  more plumbing than one list needs.
- **`useActionState`.** It queues dispatches one after the other and does not abort by default: three quick clicks on
  Próxima would run three requests in series.

## References

- React, [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect) and
  [`useActionState`](https://react.dev/reference/react/useActionState)
- React Router, [Race Conditions](https://reactrouter.com/explanation/race-conditions)
- TanStack Query, [Disabling/Pausing Queries](https://tanstack.com/query/v5/docs/framework/react/guides/disabling-queries)
