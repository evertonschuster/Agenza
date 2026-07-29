# ADR 0030 — Branch-agnostic pre-commit

Status: superseded in part by ADR 0031 (2026-07); permission for direct local
commits to `main` remains current, while the local-hook decision is historical

> **2026-07 update:** ADR 0031 removes repository-owned local Git hooks.
> This ADR still governs permission for direct local commits to `main`.

## Context

ADR 0021 made `.husky/pre-commit` reject every commit created while the
current branch was `main`. It also added an architecture guard that failed
when that rejection was absent. This mixed two separate responsibilities:
local staged-file quality checks and the repository's delivery workflow.

The maintainer now explicitly permits direct local commits to `main`.
GitHub already evaluates delivery to `origin/main` independently through
remote branch protection and rulesets. A local branch-name check cannot
replace those remote controls, and bypassing it for one commit would leave
the documented rule and architecture guard teaching the opposite policy.

## Decision

`.husky/pre-commit` remains installed and continues to run the frontend's
`lint-staged` checks, but it must be branch-agnostic. It may not reject a
commit because the current branch is `main`, `master`, or any other branch.

Direct local commits to `main` are allowed. GitHub branch protection remains
the authority for whether a commit can be delivered to `origin/main`; this
ADR does not alter any remote protection, required status check, ruleset,
merge method, or force-push/deletion restriction.

Short-lived branches remain available for PR review, remote CI, concurrent
work, and changes that should not be accumulated on local `main`. When a
task uses a branch, the one-task-per-branch, no-stacking, rebase, and squash
merge decisions from ADR 0021 still apply.

`scripts/architecture_guard.py` reverses its old check: instead of requiring
the direct-`main` rejection, it reports a blocking finding when the
repository-owned pre-commit hook inspects the current branch through the
supported Git branch-query commands. This rejects branch-dependent policy
for `main`, `master`, `develop`, feature branches, or any other branch name.
Its regression tests and the existing Agent Governance workflow keep that
decision enforced in CI.

## Consequences

- A maintainer can create a local commit on `main` without `--no-verify` or
  disabling Husky.
- `lint-staged` still runs for every normal commit, including commits on
  `main`.
- A direct push can still be rejected by GitHub; changing that behavior is a
  separate remote-administration decision.
- Local `main` can diverge from `origin/main` if direct commits accumulate,
  so it must be synchronized before direct work and published history must
  not be rewritten.
- Concurrent agents still use isolated worktrees so allowing direct commits
  does not authorize sharing a dirty working directory.
