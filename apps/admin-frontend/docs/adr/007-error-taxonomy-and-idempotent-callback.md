# ADR 007 — AppError taxonomy, presentation/infrastructure boundary, idempotent OIDC callback

**Status:** Accepted

## Decision

1. **`AppError`** (`application/errors/AppError.ts`) is the one error shape
   presentation ever depends on for infrastructure-originated failures.
   `AuthenticatedHttpClient` converts every failure (missing token, 401,
   non-2xx `ProblemDetails`, or a fetch-level network/timeout failure) into
   an `AppError` — via `mapErrorToAppError` (infrastructure-internal) —
   before it leaves the client. `ApiError`, `ProblemDetails`,
   `UnauthenticatedError`, `NetworkError`, and `TimeoutError` never cross
   into `application/` or `presentation/`.
2. **`AppErrorCode`** taxonomy: `validation`, `conflict`, `notFound`,
   `unauthenticated`, `unauthorized`, `network`, `timeout`, `unexpected`.
   Each carries a `retryable` flag, an optional `rawFieldErrors` (flattened
   backend field → message map, for `validation`), and an optional
   `backendCode` (e.g. `"Tag.DuplicateName"`, for `conflict`/`notFound`).
3. **New infrastructure error types**: `NetworkError` (fetch itself
   rejected) and `TimeoutError` (the request's `AbortSignal.timeout` fired)
   — previously unhandled; a network failure or timeout propagated as a
   raw, unclassified exception.
4. **ESLint boundary**: `presentation/**` may no longer import
   `infrastructure/*` (new `no-restricted-imports` block in
   `eslint.config.js`). `serverFormError.ts`'s `mapApiErrorToForm` now
   reads `AppError.rawFieldErrors`/`backendCode` instead of importing
   `ApiError` directly — the one violation this rule would have caught.
5. **Curated vs. pass-through messages**: `unauthenticated`, `unauthorized`,
   and `unexpected` always get a curated pt-BR message — the raw backend
   text (`statusText`, an uncurated `detail`) is discarded, never shown to
   the user. `notFound` and `conflict` pass the backend's `title`/`detail`
   through as-is, since this API's contract (docs/adr/0012, docs/API.md)
   already treats those as user-safe, curated text. `validation` passes
   through per-field messages the same way.
6. **`HandleAuthCallback` is single-flight and idempotent per callback
   URL** — it caches the in-flight/settled promise for a given
   `callbackUrl` and returns that same promise to every caller with the
   same URL, rather than re-invoking `AuthRepository.handleCallback`. This
   survives `React.StrictMode`'s double effect invoke (and any other
   duplicate call) without a second, real authorization-code exchange — the
   code is single-use, so a second real exchange would fail on the
   identity provider's side, not just waste a request. A different
   callback URL (a fresh login) always starts a new exchange.
7. **`ErrorBoundary`** (class component, `presentation/components/`) plus
   **`RouteErrorElement`** (`presentation/routes/`, wired as the router's
   top-level `errorElement`) give the app two complementary safety nets:
   the router's own error mechanism for anything within a matched route
   (a thrown loader, an unmatched path, a lazy route's chunk failing to
   load), and a plain React error boundary — mounted in `main.tsx`, above
   `AppProviders` — for everything else (a provider or layout crashing
   outside any specific route element). Both detect a stale lazy-loaded
   chunk (`isChunkLoadError`) and offer "reload" instead of "retry" for
   that case, since re-rendering the same tree can't fetch a new chunk.

## Rationale

Two independent problems existed before this ADR:

- **Raw technical messages could reach the user.** A generic `catch` block
  rendering `error.message` would show `"Internal Server Error"`,
  `"Failed to fetch"`, or a raw `AbortError` message directly — none of
  which are pt-BR, none of which are meant for an end user (root
  `AGENTS.md`: don't expose technical detail to users). The fix has to
  live at the boundary (the HTTP client), not be repeated per page.
- **The OIDC callback had no idempotency guard beyond component-local
  state**, which does not reliably protect against `React.StrictMode`'s
  double effect invoke — a naive local ref/flag can still let a second,
  real exchange happen depending on timing. The authorization code is
  single-use, so caching at the use-case level (which lives for the app's
  lifetime, built once by the composition root) is the correct place.

## Consequences

- `AuthenticatedHttpClient`'s constructor signature is unchanged; its
  _thrown_ type changed from `ApiError`/`UnauthenticatedError` to
  `AppError` for every caller. Tests asserting the old types were updated;
  `AuthenticatedHttpClient.test.ts` now asserts `AppError` + `code`.
- Repository/page tests that previously constructed a fake `new
ApiError(...)` rejection now construct `new AppError({...})` directly
  (application-layer type) — `TagsPage`/`CategoriesPage`/`ServicesPage`
  tests updated accordingly.
- A 5xx (or any status this ADR doesn't explicitly classify) now shows a
  curated "Não foi possível concluir a operação. Tente novamente." instead
  of the raw backend `title`/`statusText` — an intentional behavior
  change, not a regression; `ApiTagRepository.test.ts` and its
  Category/Service equivalents were updated to expect the curated message.
- This ADR does not yet address `composition/container.ts` exposing raw
  repositories/`httpClient` to presentation, or moving the composition root
  under `app/`/`main/` — those are separate, later decisions (see
  docs/adr/006's own note on this).
