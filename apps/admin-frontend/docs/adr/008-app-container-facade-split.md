# ADR 008 — Grouped AppContainer facades and a narrow composition root

**Status:** Accepted; pass-through facade typing amended 2026-08-03.

## Decision

- `AppContainer` exposes grouped capability facades such as `auth` and
  `catalog`, not raw repositories or HTTP/OIDC adapters.
- `src/app/composition/container.ts` is the only construction point for concrete
  repositories, auth adapters, and `AuthenticatedHttpClient`.
- A facade member uses a real use-case `execute` shape when orchestration/policy
  exists.
- A pure repository pass-through keeps the repository method shape directly;
  it does not gain a no-op use-case class solely for naming consistency.
- Presentation tests use typed fake facades through `createFakeAppContainer`.

## Consequences

Presentation cannot bypass application policy or reach infrastructure by
construction. The container remains explicit and testable without a DI library,
while avoiding use-case wrappers that add no behavior.
