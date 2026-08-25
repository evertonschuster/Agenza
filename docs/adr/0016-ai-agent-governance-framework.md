# ADR 0016 — Cross-tool AI agent governance framework

Status: abandoned (2026-08) — accepted (2026-07), amended 2026-08-03 for portable multi-agent discovery

> **2026-08 update:** the framework described here (`AGENTS.md`,
> `.agents/skills/`, `CLAUDE.md`/Copilot bridges, and the governance scripts
> that validated them) was removed without a replacement. No formal
> instruction-file system currently governs AI agent behavior in this repo.

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
- `.agents/skills/` is the only editable repository skill source. Codex and
  GitHub Copilot consume it directly; `sync_agent_skills.py` copies it to
  `.claude/skills/` for Claude Code.
- Import-only `CLAUDE.md` files and a thin
  `.github/copilot-instructions.md` bridge route each tool to `AGENTS.md`
  without restating repository rules.
- Repository-local `agent-skills/`, `prompts/`, `.claude/agents/`, `.skills/`,
  `.codex/skills/`, and standalone `.agent.md` instruction layers are
  prohibited. `.claude/settings.local.json` is machine-local and ignored.
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

## Consequences

Agents load less unrelated context, current code outranks stale examples, and a
rule change has one editable instructional source. The Claude distribution
still duplicates bytes required for tool discovery, but the previous third
`agent-skills/` copy and tool-specific reviewer/prompt wrappers are gone.
Content-hash checks keep the remaining distribution mechanical rather than
cognitive.

The framework does not make prose self-verifying. Periodic architecture reviews
must still compare status, examples, and referenced symbols with the repository.
When drift is mechanically recognizable, the review adds a regression guard
instead of relying on future memory.
