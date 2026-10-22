# ADR 0075 — admin-frontend: a 429 is a transient problem of its own, shown with its own message

Status: accepted (2026-10); extends [ADR 0020](0020-actionable-authentication-feedback.md) (a failure carries a stable code, a
curated pt-BR explanation and a recovery action) to the rate limit, and follows
[ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) and
[ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md) (a request leaves only when an action tells it to)

## Context

services-service has no rate limiter yet: `backend/` holds no `AddRateLimiter`, `UseRateLimiter` or `429`. When one
exists, ASP.NET Core rejects with `429` and an empty body by default. The frontend was already wrong for both shapes of
that answer:

- an empty-body `429` fell to `SERVER_PROBLEM` (`status: 0`), so the person read "O servidor está instável";
- a `429` carrying a Problem body went through verbatim with `status: 429`, which is neither a sentinel code nor
  `>= 500`, so `isTransientProblem` said no and `ConfirmDialog` showed "Não é possível excluir" with only **Entendi**:
  a passing limit read as a permanent block, with no way to try again.

The owner's intent is feedback and nothing more: tell the person that the limit was hit and that they should try again.
The app does not retry on its own, and does not decide when the person may.

## Decision

1. **`run()` maps any `429` to `RATE_LIMIT_PROBLEM`, by status and whatever the body says.** Code `RateLimit.Exceeded`,
   `status: 429` (the server did answer, unlike the three `status: 0` sentinels), and a title of our own:
   "Muitas solicitações em pouco tempo. Aguarde alguns segundos e tente novamente." The backend contract for the
   limit (body, code, header) is undecided, so the frontend depends on none of it, and a screen that branches on a code
   writes its own pt-BR instead of showing the server's `title`.
2. **The code is in `TRANSIENT_PROBLEM_CODES`**, so `ConfirmDialog` offers its existing **Tentar novamente** button, as
   for a network or server failure, instead of the permanent block.
3. **Nothing else changes.** Lists, forms, dialogs and toasts show the message through the paths they already have, and
   the retry buttons stay as they were: the person decides when to click.

## Consequences

- A person who clicks **Tentar novamente** at once may meet another `429`; the message says to wait, and that is the
  whole of the guidance.
- `Retry-After` is not read. A browser could not read it across origins anyway until the services-service CORS policy
  adds `WithExposedHeaders("Retry-After")`.
- The backend can pick its 429 body, code and headers freely: the frontend ignores all of them.

## Considered and rejected

- **A countdown on the retry button** ("Tentar novamente em N s", from `Retry-After`, or a fixed 5 s without it). Built
  and removed within [PR #185](https://github.com/evertonschuster/Agenza/pull/185) at the owner's request: it was more
  than the feedback asked for. It also put a timer effect inside `usePaginatedList` and depended on a header the CORS
  policy hides.
- **An automatic retry with backoff in the facade.** A limiter exists to be asked less, and a request that leaves
  without an action is what ADR 0033 and ADR 0073 keep out of the app.
- **Branching on the body or the code the backend sends.** The contract does not exist yet, and until it did the delete
  dialog would stay wrong.
- **Showing the backend's `title`.** The screen branches on the code, so the string is ours to write (agenza-ptbr-copy).

## References

- Microsoft, [Rate limiting middleware in ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
