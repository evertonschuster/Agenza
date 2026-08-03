# ADR 0016 — Cross-tool AI agent governance framework

Status: accepted (2026-07), amended 2026-08-03

## Context

The repository originally accumulated tool-specific `CLAUDE.md`, `.skills/`,
standalone agent personas, copied templates, living docs, and generated analysis
artifacts. Several copies taught patterns already reverted in code: repository
queries inside validators, throwing expected failures, JWT-only tenant guidance,
rejected-promise fakes, removed frontend verticals, and package versions copied
outside Central Package Management. Mechanical sync checks passed because they
verified copies, not semantic truth.

## Decision

- `AGENTS.md` is the durable, tool-independent entry point at root and per area.
- `agent-skills/` is the only editable repository skill source and is copied to
  `.agents/skills/` and `.claude/skills/` by `sync_agent_skills.py`.
- Repository-local `.skills/` and standalone `.agent.md` files are prohibited.
- Skills use progressive disclosure: a short task workflow routes to API,
  testing, UI, migration, or other references only when the task touches them.
- Copied implementation templates are avoided when live compiled code is a
  reliable reference. Package versions, file inventories, test counts, bundle
  sizes, and feature status do not live in instructions.
- ADR indexes route agents around superseded decisions. Completed prompts and
  generated analysis output are removed from the active corpus; Git preserves
  their history.
- Governance checks enforce canonical distributions, resolved references,
  absence of legacy instruction layers, and known mechanically detectable
  teaching regressions. CI runs the same checks and their tests.

Thin `CLAUDE.md` files and Claude-specific reviewer definitions may remain, but
they only point to canonical rules; they never own them.

## Consequences

Agents load less unrelated context, current code outranks stale examples, and a
rule change has one editable instructional source. The two committed skill
distribution directories still duplicate bytes for tool discovery, but content
hash checks make that duplication mechanical rather than cognitive.

The framework does not make prose self-verifying. Periodic architecture reviews
must still compare status, examples, and referenced symbols with the repository.
When drift is mechanically recognizable, the review adds a regression guard
instead of relying on future memory.
