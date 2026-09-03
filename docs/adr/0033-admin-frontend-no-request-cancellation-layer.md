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
