# ADR 0031 — Remove repository-owned local Git hooks

Status: accepted (2026-07); supersedes the local-hook portions of ADR 0030

## Context

The repository used Husky and lint-staged to run ESLint and Prettier against
the staged snapshot of frontend files before each commit. That snapshot can
differ from the working tree during partial staging, which made failures
surprising and encouraged bypassing or commenting out the hook. The hook was
also a partial duplicate of the explicit quality suite: it did not run the
frontend build, coverage tests, governance checks, backend checks, or AI
service checks.

Local Git hooks are not a reliable integration boundary because contributors
can bypass them and automation may not install them. Required GitHub Actions
checks already run the complete stack-specific suites before changes can be
integrated into `origin/main`.

## Decision

The repository does not install or own local Git hooks. Husky, lint-staged,
the root `prepare` script, `.husky/pre-commit`, and workspace lint-staged
configuration are removed.

Contributors and agents still run every applicable command documented in
`AGENTS.md` before calling work complete. The frontend CI continues to run
format checking, lint, build, coverage tests, and browser tests. GitHub branch
protection and required status checks remain the delivery gate for
`origin/main`.

The architecture guard rejects reintroduction of the removed hook or package
configuration. This decision does not prohibit an individual contributor from
maintaining untracked personal hooks outside repository-owned configuration.

## Consequences

- A normal local commit no longer runs ESLint or Prettier automatically.
- Partial staging no longer causes lint-staged to validate a snapshot that
  differs from the visible working tree.
- Local feedback depends on contributors running the documented commands or
  editor integrations.
- CI remains the authoritative automated quality gate and may report failures
  later than a local hook did.
- Removing the partial pre-commit check does not relax lint, formatting,
  build, test, coverage, governance, or branch-protection requirements.
