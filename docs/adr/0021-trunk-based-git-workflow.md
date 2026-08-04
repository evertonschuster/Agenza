# ADR 0021 — Trunk-based Git workflow

Status: accepted (2026-07), amended by ADRs 0030 and 0031. This document records
the current workflow only.

## Decision

- `main` is the only long-lived branch.
- A task branch starts from current `origin/main` and uses
  `<type>/<short-slug>` where type is `feat`, `fix`, `chore`, `docs`, or
  `refactor`.
- Do not stack a task on an unmerged feature branch. Concurrent work uses
  isolated worktrees.
- Rebase a task branch onto current `origin/main` before review/update.
- PRs squash-merge and delete the task branch.
- Direct local commits to synchronized `main` are permitted; remote protection
  controls delivery to `origin/main`.
- Never force-push or rewrite published shared history.
- The repository owns no local Git hook; contributors run the documented gates
  explicitly and CI is the integration boundary.

## Consequences

The history remains linear and task-focused while supporting local direct work,
PR review, and concurrent agents without creating permanent release/develop
branches or hidden local hook behavior.
