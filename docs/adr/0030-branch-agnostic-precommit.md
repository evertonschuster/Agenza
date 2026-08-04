# ADR 0030 — Direct local commits to main are permitted

Status: accepted for branch policy; local-hook content superseded by ADR 0031
(2026-07).

## Decision

- The repository does not forbid a contributor from committing to local
  `main` after synchronizing with `origin/main`.
- Remote branch protection/rulesets decide what may reach `origin/main`.
- Short-lived task branches remain preferred when PR review, remote CI,
  concurrent work, or isolation is useful.
- Published history is never rewritten; task branches rebase before review and
  squash-merge.

The repository owns no pre-commit hook. See ADR 0031.
