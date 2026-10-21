# ADR 0075 — admin-frontend: a 429 is a transient problem of its own, and the retry control waits before it re-enables

Status: accepted (2026-10); extends [ADR 0020](0020-actionable-authentication-feedback.md) (a failure carries a stable code, a
curated pt-BR explanation and a recovery action) to the rate limit, and follows
[ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) and
[ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md) (a request leaves only when an action tells it to)

## Context

services-service has no rate limiter yet: `backend/` holds no `AddRateLimiter`, `UseRateLimiter` or `429`. When one
exists, ASP.NET Core rejects with `429` and an empty body by default, and writes `Retry-After` only if `OnRejected` is
customised. The frontend was already wrong for both shapes of that answer:

- an empty-body `429` fell to `SERVER_PROBLEM` (`status: 0`), so the person read "O servidor está instável";
- a `429` carrying a Problem body went through verbatim with `status: 429`, which is neither a sentinel code nor
  `>= 500`, so `isTransientProblem` said no and `ConfirmDialog` showed "Não é possível excluir" with only **Entendi**:
  a passing limit read as a permanent block, with no way to try again.

Nothing in the app retries on its own, which is right for a limiter, but the retry buttons answered at once, so a
person clicking **Tentar novamente** kept asking a service that had just said to slow down.

## Decision

1. **`run()` maps any `429` to `RATE_LIMIT_PROBLEM`, by status and whatever the body says.** Code `RateLimit.Exceeded`,
   `status: 429` (the server did answer, unlike the three `status: 0` sentinels), and a title of our own:
   "Muitas solicitações em pouco tempo. Aguarde alguns segundos e tente novamente." The backend contract for the
   limit (body, code, header) is undecided, so the frontend depends on none of it, and a screen that branches on a code
   writes its own pt-BR instead of showing the server's `title`.
2. **The code is in `TRANSIENT_PROBLEM_CODES`**, so `ConfirmDialog` offers **Tentar novamente**, as for a network or
   server failure.
3. **`ApiProblem` gains `retryAfterSeconds`, a frontend-only field.** The facade reads `Retry-After` as whole seconds,
   caps it at 60, and uses 5 when the header is missing, is not a whole number, or is an HTTP date.
4. **The retry control waits that many seconds before it re-enables**, labelled "Tentar novamente em N s".
   `ErrorState` takes `retryInSeconds`; `ConfirmDialog` computes it for its own button. The count is `useCooldown`
   (`shared/hooks`): a number in state that a `setTimeout` lowers by one each second, started by whoever records the
   failure, so each new failure restarts it.
5. **Lists get it in one place.** `usePaginatedList` starts the cooldown when an answer fails and puts
   `retryInSeconds` on `list.failure`; `ListSectionError` hands it to `ErrorState`. Pessoas and Etiquetas need no code
   of their own.

## Consequences

- A browser cannot read `Retry-After` across origins unless the response lists it in `Access-Control-Expose-Headers`.
  The services-service CORS policy has no `WithExposedHeaders`, so until the backend adds
  `WithExposedHeaders("Retry-After")` every wait is the fixed 5 s. The reading is tested and takes effect with that
  backend change, which is its own PR.
- Forms and the open-for-edit toasts have no retry control to hold; they show the new message and nothing else.
- The cooldown is an effect inside `usePaginatedList` (a timer keyed on its own seconds). It asks for nothing: a request
  still leaves only from an action, the mount and the correction of a page past the end, as ADR 0073 fixes, and the
  hook's tests for that rule are unchanged.
- The count is a number of timer ticks, not a deadline, so a throttled background tab can stretch a wait of 5 to 60
  seconds. It never shortens one.

## Considered and rejected

- **An automatic retry with backoff in the facade.** A limiter exists to be asked less, and a request that leaves
  without an action is what ADR 0033 and ADR 0073 keep out of the app.
- **A deadline (`Date.now() + seconds`) with the label computed from it.** It needs a clock read during render, which
  `react-hooks/purity` forbids, or a stored "now" that is stale when a new failure arrives on a mounted component.
- **Branching on the body or the code the backend sends.** The contract does not exist yet, and until it did the delete
  dialog would stay wrong.
- **Showing the backend's `title`.** The screen branches on the code, so the string is ours to write (agenza-ptbr-copy).
- **A timer inside `ErrorState`, started when it mounts.** It would not restart when a refetch fails while the failure is
  already on screen, and the dialog would still need its own.

## References

- MDN, [`Retry-After`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After) and
  [`Access-Control-Expose-Headers`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers)
- Microsoft, [Rate limiting middleware in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
