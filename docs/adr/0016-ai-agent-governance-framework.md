# ADR 0016 — Cross-tool AI agent governance framework

Status: accepted (2026-07)

## Context

This repository is built AI-first (docs/SDD-GUIDE.md): agents read
`CLAUDE.md`/`.skills/` and execute, CI verifies. Until now that
instruction stack was Claude Code-specific in shape (`CLAUDE.md` at each
level, `.skills/` directories read by convention rather than by any
tool's own discovery mechanism) and entirely undistributed for any other
agent — a session using OpenAI Codex, or any other `AGENTS.md`-reading
tool, had no equivalent entry point at all.

Auditing the existing instruction stack while building its replacement
surfaced a concrete, already-real failure mode this ADR is partly a
response to: `backend/.skills/backend-use-case/SKILL.md`'s copy-paste
templates still showed a `CreateWidgetCommandValidator` taking an
`IWidgetRepository` and a `MustAsync` rule querying it — the exact shape
docs/adr/0010 introduced and docs/adr/0012 reverted. The prose earlier in
the same file had been updated to describe the reverted state correctly;
the templates underneath it, copied verbatim by whoever/whatever last
used the skill, had not. `apps/admin-frontend/.skills/admin-feature-vertical/SKILL.md`
had a milder version of the same problem: it described every form as "a
plain, dialog-agnostic `<form>`" with no mention of React Hook Form, Zod,
or the structured server-error-to-field mapping (`serverFormError.ts`,
`useCreateInline.ts`) the codebase had already adopted. Neither drift was
caught by any existing gate, because no gate looked at instructional
content at all — CI checks code, not the documents telling an agent how
to write it.

## Decision

### `AGENTS.md` is the canonical, tool-independent instruction source

A new root `AGENTS.md`, `backend/AGENTS.md`, and
`apps/admin-frontend/AGENTS.md` hold every durable rule that previously
lived only in the matching `CLAUDE.md`. Each `CLAUDE.md` becomes a thin
`@AGENTS.md` import (plus, at the root only, Claude Code-specific
integration notes — which skills/subagents to prefer, which governance
commands to run before finishing a turn). This is a refactor, not a
rewrite: the backend and frontend `AGENTS.md` files are the previous
`CLAUDE.md` content, moved and lightly cross-referenced, not
reauthored from scratch — none of it needed to change, since it was
already tool-neutral prose.

### `agent-skills/` is the single editable skill source

Eight canonical skills (`agenza-backend-use-case`, `agenza-frontend-feature`,
`agenza-exception-flow-audit`, `agenza-architecture-review`,
`agenza-rule-persistence`, `agenza-api-contract-review`,
`agenza-tenant-isolation-review`, `agenza-migration-safety`) live once,
with portable frontmatter, and are synced — by content hash, never by
hand — into `.agents/skills/` (Codex) and `.claude/skills/` (Claude Code)
by `scripts/sync_agent_skills.py`. Two of the eight replace true
duplicates: `agenza-backend-use-case` replaces
`backend/.skills/backend-use-case` (fixing the `MustAsync`/repository
drift described above in the process — the new templates are a direct,
verified copy of the current `Tags` feature's actual code, not a
from-scratch rewrite), and `agenza-frontend-feature` replaces
`apps/admin-frontend/.skills/admin-feature-vertical` (documenting the
React Hook Form/Zod/structured-error pattern the old skill missed). Three
other pre-existing local skills (`backend-new-microservice`,
`admin-api-contract`, `admin-tdd-conventions`) don't duplicate a canonical
skill's purpose and stay where they are, referenced directly from the
area `AGENTS.md` files.

### Guard scripts make drift mechanically detectable, not just documented

`scripts/architecture_guard.py` scans both application source (backend
C#, frontend TS/TSX) and the fenced code blocks inside Markdown
instruction/skill files for the specific patterns docs/adr/0012 and
docs/adr/0014 reverted (`DuplicateEntityException`,
`BusinessExceptionHandler`, `ValidateAndThrow`, a repository dependency or
`MustAsync`/`CustomAsync` rule in a validator, a domain entity throwing
instead of returning `DomainResult`) plus a small set of frontend/
documentation checks (`any` usage, cross-feature-page imports, coverage-
exclude drift, dangling `docs/adr/NNNN` references — the latter a second
real, already-fixed bug this repo hit once, per docs/HARDENING_REPORT.md's
finding of 14 references to a nonexistent ADR 0013). Scanning code blocks
inside Markdown specifically — not just application source — is what
would have caught the `backend-use-case` skill's stale template before
this ADR: the "no repository in a validator" rule already existed in
prose right above the offending code block.

`scripts/check_agent_governance.py` checks the governance meta-files
themselves for structural consistency (files present, `CLAUDE.md`
importing correctly, skill frontmatter portable and valid, `.agents/skills/`
and `.claude/skills/` in sync with `agent-skills/`, no `.codex/skills`
distribution directory, every referenced ADR/script/npm-command actually
existing).

### The same three checks run in three places, none of them trusting the others

A Claude Code Stop hook (`scripts/claude_stop_guard.py`, wired via
`.claude/settings.json`) runs all three scripts before a turn is allowed
to end, reading `stop_hook_active` from its input to guarantee it can
never loop indefinitely. Any other agent (Codex included) gets the same
three commands documented directly in `AGENTS.md`'s "Mandatory commands"
section, since Codex has no hook mechanism to wire into. CI
(`.github/workflows/agent-governance.yml`) runs the same three commands
on every PR/push regardless of whether any agent tool is installed — the
backstop that doesn't trust either the hook or an agent's own diligence.

## Consequences

**Benefits**: one rule change now has exactly one place to land
(`agent-skills/` + the matching `AGENTS.md`) instead of needing to be
kept in sync across a Claude-specific and a hypothetical Codex-specific
copy by hand; the stale-template class of bug this ADR opens with now has
an automated check (`architecture_guard.py`'s code-block scan) instead of
depending on a human rereading every skill after every ADR; Codex (or any
other `AGENTS.md`-reading agent) gets the same instruction quality Claude
Code already had, on day one, instead of a lesser or absent instruction
set.

**Costs**: two more directories now exist that must never be hand-edited
(`.agents/skills/`, `.claude/skills/`) — `check_agent_governance.py`'s
sync check is what makes a hand-edit there loud instead of silent;
`agent-skills/agenza-backend-use-case` and `agenza-frontend-feature`
duplicate a meaningful fraction of their now-obsolete
`backend/.skills/`/`apps/admin-frontend/.skills/` predecessors' content by
necessity (a redirect stub isn't useful on its own) — this is accepted as
the cost of having one canonical, portable copy instead of two
tool-specific ones that can drift.

This does not reopen docs/adr/0005's CQRS-dispatcher decision, docs/adr/0012's
validator/handler split, or docs/adr/0014's Result-pattern decision — it
only changes *how* those decisions are taught to an agent and *how* their
reversal is guarded against recurring, not the decisions themselves.
