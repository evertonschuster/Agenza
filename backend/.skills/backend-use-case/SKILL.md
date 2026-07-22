---
name: backend-use-case
description: >
  OBSOLETE — superseded by agent-skills/agenza-backend-use-case. Do not
  use this file; read the canonical skill instead.
---

# Backend Use Case (obsolete — moved)

This skill's content moved to
[`agent-skills/agenza-backend-use-case/SKILL.md`](../../../agent-skills/agenza-backend-use-case/SKILL.md)
(distributed to `.claude/skills/agenza-backend-use-case/` and
`.agents/skills/agenza-backend-use-case/` by
`scripts/sync_agent_skills.py`) as part of the cross-tool governance
migration (see `docs/AGENT-GOVERNANCE.md`).

The migration also fixed a real drift in this file's old copy-paste
templates: they still showed `MustAsync` validator rules taking a
repository dependency (the docs/adr/0010 shape), which docs/adr/0012
reverted — validators in this codebase take no repository dependencies,
and existence/uniqueness checks live in the handler. The canonical skill's
templates now match the actual `Tags` feature code exactly. Read the
canonical skill, not this file.
