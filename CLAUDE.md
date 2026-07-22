@AGENTS.md

# Claude Code integration

Use the skills available under `.claude/skills/` whenever a skill's
description matches the task at hand — they are synced copies of the
canonical skills in `agent-skills/`, never edit them directly.

For architecture, exception-flow, API-contract, or tenant-isolation
reviews, prefer the matching read-only subagent in `.claude/agents/`
(`agenza-architecture-reviewer`, `agenza-exception-auditor`,
`agenza-contract-reviewer`, `agenza-tenant-reviewer`) over redoing the
review inline.

Run the governance checks before considering any task complete:

```bash
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py
```

Do not claim a task is complete while any applicable gate — these
governance scripts, build, test, lint, or coverage — is still failing.
