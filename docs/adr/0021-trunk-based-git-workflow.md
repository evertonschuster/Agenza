# ADR 0021 — Trunk-based git workflow, single long-lived branch

Status: accepted (2026-07)

## Context

This repo is developed by a solo maintainer directing several concurrent
AI agents (Claude Code, Codex, GitHub Desktop for manual commits) against
the same clone. That combination surfaced a concrete failure mode: local
`main` had accumulated 9 commits that were never pushed through a PR,
while `origin/main` had advanced independently by a commit merged through
GitHub — the two histories could no longer fast-forward against each
other. Separately, a chain of stacked feature branches
(`feat/backend-hardening-and-comment-cleanup` ←
`feat/login-redesign-and-auth-flow` ←
`feat/auth-transition-and-race-hardening`, mirrored onto an ad hoc
`develop` branch) had each been merged into its *parent feature branch*
rather than into `main`, so the stack's real integration into `main` kept
getting deferred — by the time anyone tried, `main` had moved through
several unrelated PRs and dependency bumps, producing large conflicts.
Eight more branches lingered locally after GitHub had already deleted
them post-merge, with no signal distinguishing "safe to delete" from
"still live."

None of this was caused by a single mistake — it was the absence of a
documented, mechanically-enforced convention. `.github/workflows/*.yml`
and GitHub branch protection were already built around a single
branch (`main`); nothing else in the repo (CI, docs, `AGENTS.md`) said
that was the intended model, so nothing stopped a second long-lived
branch (`develop`) or direct commits to `main` from happening anyway.

## Decision

**One long-lived branch: `main`.** No permanent `develop`/staging branch.
`main` is always releasable; branch protection (required status checks:
`frontend-build-and-test`, `backend-build-and-test`,
`ai-services-build-and-test`, `enforce_admins`, no force-push, no
deletion) already assumes this and is unchanged by this ADR.

**All work happens on short-lived branches cut from an up-to-date
`main`**, named `<type>/<slug>` (`feat/`, `fix/`, `chore/`, `docs/`,
`refactor/`) — one task per branch, never chained into a parent feature
branch (the stacked-PR pattern above is what turned a small conflict
into a large one; a branch that must build on unmerged work should still
target `main` directly once ready, rebasing to pick up the dependency
rather than merging into it).

**Rebase onto `origin/main` before opening or updating a PR**, and again
before merging if `main` moved meanwhile — resolving a handful of
conflicting lines same-day beats reconciling weeks of drift at the end.

**Squash merge only**, with GitHub configured to auto-delete the head
branch on merge (`allow_squash_merge: true`,
`allow_merge_commit`/`allow_rebase_merge: false`,
`delete_branch_on_merge: true`) — this removes the "is this branch still
live" ambiguity that produced eight stale local branches, and keeps
`main`'s history one commit per shipped change.

**Concurrent agents get isolated working trees.** Two agents (or an agent
and a human using GitHub Desktop) operating on the same clone at once is
expected here, not an edge case — use `git worktree add ../agenza-<slug>
<branch>` (or the Agent tool's `isolation: "worktree"`) per concurrent
task instead of sharing one working directory, so uncommitted changes
from one task are never sitting on the branch another task expects to be
clean.

**Enforcement is mechanical, not just documented.** `.husky/pre-commit`
rejects any commit made directly on `main` — every agent and every human
hits the same check regardless of whether they've read this ADR or
`AGENTS.md`, which is the point: the convention has to survive without
being re-explained in every session.

## Consequences

**Benefits**: one branch to keep synchronized instead of two (no repeat
of the `main`/`develop` divergence this ADR responds to); every PR target
is already covered by existing CI and branch protection, so no workflow
files needed new `branches:` triggers; the local-hook check catches a
direct-`main` commit at the moment it happens instead of at PR time.

**Costs**: no separate "integration" branch means a half-finished
multi-day effort has nowhere to live except its own feature branch kept
alive across sessions — acceptable here since branches are meant to be
short-lived and rebased, not because multi-day work is disallowed.
`origin/develop` and the stacked `feat/*` branches that predate this ADR
are not deleted by it; they hold real unmerged work (including
security-relevant auth/session-timing fixes) and need a reviewed PR into
`main` before being retired, not a silent rebase.

This does not change anything about CI gates, coverage thresholds, or the
agent-governance framework (docs/adr/0016) — only how branches are
created, named, and merged.
