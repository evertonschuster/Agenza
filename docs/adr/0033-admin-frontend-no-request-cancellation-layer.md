# ADR 0033 — No request-cancellation layer in the admin-frontend API path

Status: accepted (2026-09)

## Context

The admin-frontend reaches services-service through one path: `servicesApi`
(`shared/api/servicesFacade.ts`) → `apiClient` (`openapi-fetch`) → a feature
repository → a page or route `loader`.

Twice, a request-cancellation layer was added here, and twice it was reverted:

- An `AbortController` was threaded through `createServicesFacade` /
  `createApiClient`, so every repository method took an optional `signal`, plus
  a `useApiResource` hook that owned the controller and aborted the in-flight
  request on unmount or on a new request.
- It was reverted because it was awkward at the call site (every repository
  method grew a `signal` argument to pass or forget; the hook conflated
  fetching, cancellation, and local state), and because it solved a problem a
  smaller mechanism already solves. The only real bug was a stale response
  resolving after the component that asked for it had unmounted — and React's
  effect-cleanup `ignore` flag (the pattern from the React docs) already
  discards that late response.
- Nothing in the app is slow enough on the wire that a user benefits from
  aborting a request already sent: one list endpoint, small payloads, no
  search-as-you-type, no large export or report download.

## Decision

No `AbortController` plumbing in `shared/api` or in repositories. `servicesApi`
(`get` / `post` / `put` / `del`) takes no `signal`, and repository methods
state one typed HTTP call each and nothing about cancellation.

The one race a consumer must still defend against — a response landing after
the consumer is gone — is handled at the consumer, not by a shared layer:

- a route `loader` result that arrives after the router has navigated on is
  discarded by React Router itself;
- a `useEffect` that fetches uses the `ignore`-flag cleanup pattern.

Revisit this decision when a concrete need appears — search-as-you-type, or a
large export/report the user should be able to abort mid-flight — and scope
the change to that endpoint rather than retrofitting the whole facade.

## Consequences

- Repository and facade signatures stay minimal; there is no `signal` to
  thread through four layers or to forget in one.
- A future endpoint that genuinely needs abort is a reason to reopen this ADR
  for that endpoint, not a reason to add cancellation everywhere.
- The `useApiResource` hook shape is spent: if cancellation returns, it should
  not come back as a hook that also owns fetching and state.

## Amendment (2026-09-20)

`servicesFacade.ts`'s `CallOptions`/`LooseOptions`/`buildInit` now accept an optional `signal`,
and `features/tags/ui/pages/TagListPage/useTagListPage.ts`'s `fetchTags` uses it — requested
directly, not because a bug appeared; the `latestRequestRef` counter it replaced already fully
closed the out-of-order-response race this ADR's own `ignore`-flag guidance describes. `/tags`
still meets neither of the two conditions this ADR names for revisiting ("search-as-you-type, or
a large export/report") — this is not that concrete need arriving, it's a deliberate exception
made without one, kept narrow on purpose. It does not repeat either problem this ADR's Context
section blames for the earlier revert: `signal` is one optional field threaded through three
points in one shared file, not a parameter grown on every repository method (only `tagsRepository.list`
passes one; `delete` doesn't, since a single confirm-click has no overlapping-call race to guard
against), and there is no `useApiResource`-style hook — `fetchTags` owns fetching, cancellation
and local state together, in one function, the shape this ADR's last Consequence still asks for.
The decision above — no blanket cancellation layer, scope any exception to the one endpoint that
asks for it — stands as the default; this is that scoped exception, not a reversal. Full reasoning:
`apps/admin-frontend/docs/ARCHITECTURE.md` §5 (search "AbortController") and §6 (the accepted,
narrow gap in how `run()` classifies an aborted request's own `AbortError`).
