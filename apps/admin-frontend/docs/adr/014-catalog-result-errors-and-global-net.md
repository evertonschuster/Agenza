# ADR 014 — Catalog is throw-free end to end; one global net catches the rest

**Status:** Accepted. The "Auth is out of scope" note below is superseded
by docs/adr/015 - Auth now follows the same Result convention too. The
Catalog decision and the global-net decision below are otherwise still
accurate.

## Decision

Within `features/catalog/` (Categories and Tags) and the shared hooks they
depend on, no business or presentation code throws for an expected
outcome, and no business or presentation code catches an exception as its
error-handling mechanism:

- `Category.create()`/`Tag.create()` return `Result<T, InvalidXError>`
  instead of throwing.
- `mapCategoryDtoToDomain`/`mapTagDtoToDomain` convert that failure into a
  curated `AppError` right there (`malformedResponseError()`,
  `shared/infrastructure/http/malformedResponseError.ts`), so every
  `ApiCategoryRepository`/`ApiTagRepository` method stays
  `Result<T, AppError>` end to end. Composition uses `flatMapResult`/
  `combineResults` (`shared/application/Result.ts`) instead of nested
  `Result`s.
- `useAsync` (`shared/presentation/hooks/useAsync.ts`) takes
  `() => Promise<Result<T, E>>` instead of `() => Promise<T>`, and branches
  on `result.success` internally instead of `try/catch`.
- `useDeleteConfirmation` takes `onDelete: (item: T) => Promise<Result<void,
AppError>>` instead of a throwing `Promise<void>`.
- Every Catalog hook that used to convert a `Result.Failure` into a throw
  purely to route it through a `catch` block (`useCategoryEditor`,
  `useCategoriesListPage`, `useTags`, `useTagEditor`) now branches on the
  `Result` directly.

Separately, `main.tsx` now wires a global error-capture net:

- `shared/application/ErrorReporter.ts` (port) +
  `shared/infrastructure/observability/ConsoleErrorReporter.ts` (default
  adapter) — swap the adapter for a real backend (Sentry, Application
  Insights, a custom endpoint) later; nothing else in the app depends on
  the concrete class.
- `createRoot(root, { onCaughtError, onUncaughtError })` (React 19)
  centralizes reporting for everything any error boundary
  (`ErrorBoundary`, the router's `errorElement`) catches or misses, in one
  place instead of duplicated per boundary. `ErrorBoundary.componentDidCatch`
  no longer logs on its own.
- `window.addEventListener('unhandledrejection' | 'error', ...)` covers
  the two surfaces no React error boundary can reach: a promise an async
  event handler never awaited, and a synchronous throw outside React's
  render/effect cycle.

## Rationale

Two failure categories were being handled by the same mechanism
(`try`/`catch`/`throw`), which made it impossible to tell, from a hook's
code alone, whether a given catch handled something _expected_ (a 409
conflict, a 404) or something _unexpected_ (a bug). `flatMapResult`
tracing a Result through `Category.create()`/`mapCategoryDtoToDomain`
surfaced exactly this ambiguity: a malformed backend response could throw
from inside a repository call that every caller assumed, by its
`Result`-returning contract, could not throw (see docs/adr/013's
follow-up discussion). Separating the two - `Result` for anything a
caller is expected to branch on, exceptions reserved for what a global
net catches - removes that ambiguity, mirrors the backend's own
Result/DomainResult discipline (docs/adr/0012, docs/adr/0014 in the
backend repo), and was validated end-to-end on Catalog specifically
because catching the malformed-response gap there is what motivated this
change in the first place.

The global net exists because eliminating throws from Catalog's own code
doesn't eliminate every way an error can reach the browser - a genuine
bug (a `TypeError`, a contract violation elsewhere in the app) can still
throw, and until now nothing outside a single `try/catch` block observed
that centrally. React 19's `onCaughtError`/`onUncaughtError` were chosen
over per-boundary logging specifically because this app already has two
independent boundaries (`ErrorBoundary`, `RouteErrorElement`) - a
root-level hook reports both without either boundary needing to know
about reporting at all.

`ApiError`/`ApiProblemDetails` parsing inside `AuthenticatedHttpClient`/
`parseApiResponse.ts` (and `decodeCategoryDto`/`decodeTagDto`'s own
malformed-payload throw) are unaffected - they're private implementation
detail fully contained within one function, never crossing the
`HttpClient` interface's public, always-`Result` surface. "No throw in
business/interface logic" is about code a caller has to reason about, not
every internal statement of an infrastructure adapter.

**Auth (`features/auth/`) is explicitly out of scope for this pass.**
`Session`/`User`/`Tenant` domain entities, `CallbackPage`/`LoginPage`, and
`OidcAuthRepository` still throw - that's a separate, deliberate follow-up
given the extra scrutiny authentication/session code warrants
(AGENTS.md's question policy). `AuthProvider.tsx`'s own `useAsync` call
site is the one adapter point where Auth's still-throwing
`getCurrentSession()` meets `useAsync`'s new Result-based contract; that
conversion happens locally in `AuthProvider.tsx`, not by changing Auth's
own architecture.

## Consequences

- `.agents/skills/agenza-frontend-feature`'s "frontend's own,
  already-established exception-and-catch convention" (describing domain
  entity factories) now applies to Auth only - Catalog's domain entities
  return `Result`. The skill is updated to say so explicitly.
- A new Catalog feature vertical (Services, when built) should follow
  Catalog's Result-all-the-way shape, not Auth's throwing one.
- `useDeleteConfirmation`'s `fallbackMessage` parameter is gone - it
  existed to cover a non-`Error` thrown value, which no longer reaches it;
  `toUiError` already curates anything that isn't a well-formed `AppError`.
- A handful of existing tests exercised the old "any thrown `Error`'s raw
  `.message` renders" behavior via a force-cast fixture
  (`new Error(...) as unknown as AppError`) - fixed to construct a real
  `AppError`, matching what `mapErrorToAppError` actually produces and
  the codebase's existing "never render a raw non-`AppError` message"
  rule everywhere else.
- Reporting is not yet wired to a real backend - `ConsoleErrorReporter` is
  a placeholder. Choosing a vendor/endpoint is a follow-up, not blocked by
  this ADR.
