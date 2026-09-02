# ADR 0035 — admin-frontend has no server-state library yet; when one lands, it replaces the repository

Status: accepted (2026-09)

## Context

The admin-frontend has one list screen, `categories`. Since the categories
slice was rebuilt as the reference feature, its data is loaded by the route
`loader`; create and edit go through the route `action`; and React Router
revalidates the loader automatically after every action. `useNavigation`
gives the pending state.

That covers fetch-on-navigation, mutate, refetch-after-mutate, and a loading
indicator. It does **not** cover: keeping a list cached across a route change,
serving stale-while-revalidate, deduping concurrent requests for the same
key, refetch-on-window-focus, or optimistic updates.

## Decision

No TanStack Query, SWR, or RTK Query now.

Adopt one when a concrete trigger fires:

- a third or fourth list screen exists (Services, Clients, Appointments, …),
  so reusing one screen's cached data on another stops being hypothetical;
- the first time a route's data should survive navigating away and back
  without a refetch;
- a real need for request deduplication or refetch-on-focus.

**When it enters, the query layer replaces the repository — it does not stack
on top of it.** A repository method (`categoryRepository.list`) exists to
state exactly one typed HTTP call. A query layer states the same call plus its
cache key and staleness. Keeping both means every endpoint is described in two
places that must agree. The migration is: `categoryRepository.list()` becomes
`categoryQueries.list()` returning `queryOptions({ queryKey, queryFn })`, and
the route `loader` calls `queryClient.ensureQueryData(categoryQueries.list())`.
The facade (`servicesApi`) and `unwrap.ts` stay; only the per-endpoint layer
changes shape.

## Consequences

- Until the trigger, "how is server state managed here" has a boring, correct
  answer: the router's `loader` / `action` / revalidation.
- The repository is deliberately shaped as a thin function returning
  `Promise<ApiResult<T>>` per endpoint, so a query layer can absorb it rather
  than wrap it.
- This ADR is where the trigger is written down, so adding the dependency
  later is a decision with a paper trail rather than a reflex during the
  fourth list screen.
