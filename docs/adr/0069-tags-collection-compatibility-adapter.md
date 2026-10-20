# ADR 0069 — Preserve the tags collection consumer during the paging rollout

Status: accepted (2026-10-20); supersedes the frontend-compatibility consequence and the
collection-adapter rejection in [ADR 0068](0068-tags-paginated-list.md). The backend paging
contract in that ADR is unchanged. The adapter was retired by
[ADR 0074](0074-admin-frontend-tags-list-asks-only-when-told.md), which pages the screen; this
record stays as the decision that held until then.

## Context

The tags endpoint now returns a bounded page on every request, while the existing screen
consumes a complete Tag array. Regenerating the OpenAPI types made that mismatch a TS2322
build failure. Leaving the consumer broken until another PR would make the backend change
fail the frontend gate and prevent independent integration.

The user requested correction of the failing pipeline. Adding the screen's pagination controls
is a separate frontend feature. Returning only the first page through the old collection interface
would silently hide tags after the page boundary.

## Decision

Keep the existing tagsRepository.list(search, signal) collection interface as a compatibility
adapter in this contract change. It requests bounded pages of 100 sequentially through servicesApi,
preserving the search and AbortSignal on every request, and returns their items in order.

The adapter stops when the returned page reaches the filtered total, or when a page is empty.
If any page fails, it forwards the same failure result and discards the partial collection.
It does not catch exceptions, normalize errors, call fetch directly or introduce a shared paging
abstraction. The existing screen retains its complete-catalog behavior.

The API remains always paginated. A separate frontend PR will introduce page navigation and
replace this collection adapter with an explicit page contract at the repository, URL and hook
together. That is the retirement trigger for the adapter.

## Consequences

- The backend contract change carries the generated types and its necessary consumer compatibility
  fix so the existing frontend can compile and work with the new response.
- This deliberately reverses the adapter rejection recorded in ADR 0068 after the CI failure proved
  that the previous delivery boundary was not independently integrable.
- The API limits each response, but the existing screen still loads the complete filtered catalog.
  Reducing the screen's total loading cost requires the separate pagination UI.
- Repository tests cover all-page traversal, order, search, cancellation propagation, empty pages
  and failures on the first or a later page. No UI or list-hook behavior changes here.
- Offset pagination does not introduce a snapshot across requests; this adapter has the same
  consistency limits as any consumer traversing those pages.

## Alternatives considered

A cast or suppression would hide the contract mismatch. Unwrapping only items from the first page
would truncate the existing screen. Adding pagination controls in the CI repair would expand it
into the separate frontend feature. Each was rejected in favor of an explicit compatibility adapter.
