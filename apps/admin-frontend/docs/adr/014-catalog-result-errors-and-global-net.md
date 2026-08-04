# ADR 014 — Expected frontend failures use Result; one global technical net

**Status:** Accepted. ADR 015 extends the same decision to Auth.

## Decision

- Domain factories return `Result` for invalid external/user values.
- Decoders/mappers/repositories compose expected failures into
  `Result<T, AppError>`.
- `AuthenticatedHttpClient` converts session, HTTP, Problem Details, network,
  timeout, and decoder failures to curated `AppError` values.
- Hooks and presentation branch on Result/state; they do not catch expected
  failures, parse raw exceptions, or render arbitrary `.message` text.
- Test fakes resolve `Result.failure` for expected outcomes. Rejected promises
  exercise only the unexpected technical boundary.
- A single top-level/global error boundary remains for programming errors and
  unexpected render/runtime failures.

## Error taxonomy

Presentation depends only on stable application codes such as validation,
conflict, not-found, unauthenticated, unauthorized, network, timeout, and
unexpected. Structured backend field errors are mapped through curated
feature-local rules.

## Consequences

Expected failures are explicit and testable end to end; thrown errors remain a
last-resort technical safety net rather than business control flow.
