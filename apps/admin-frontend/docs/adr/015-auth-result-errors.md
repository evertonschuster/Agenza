# ADR 015 — Auth expected failures use Result

**Status:** Accepted.

## Decision

- Auth domain factories and OIDC-to-domain mapping return `Result` for missing or
  invalid claims and domain values.
- Auth repository operations map expected OIDC/session failures to stable
  `AuthFlowError`/`AppError` values.
- Login, callback, current-session, renewal, and logout presentation flows branch
  on explicit results/state rather than expected try/catch control flow.
- Identity/tenant changes during renewal are treated as invalid session state and
  require a new login.
- Unexpected provider/programming failures may still throw to the global
  technical boundary.

## Consequences

Auth and Catalog share one failure model: expected outcomes are values, while
exceptions remain reserved for unexpected technical failure.
