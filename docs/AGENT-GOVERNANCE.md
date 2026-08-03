# AI agent governance

The repository keeps one portable instruction source per responsibility and
uses progressive disclosure so tools load task-specific workflows only when
needed.

## Instruction stack

```text
AGENTS.md                           durable repo-wide rules and routing
├── backend/AGENTS.md               backend-only rules
├── apps/admin-frontend/AGENTS.md   frontend-only rules
├── .agents/skills/*                portable task workflows and references
├── docs/adr/README.md              accepted/superseded decision routing
└── living docs, config, code       current state and executable truth

.agents/skills/ --sync--> .claude/skills/
```

Codex and GitHub Copilot consume `AGENTS.md` and `.agents/skills/`. Claude Code
loads the same `AGENTS.md` files through import-only `CLAUDE.md` files and uses
the synced `.claude/skills/` distribution. `.github/copilot-instructions.md` is
a thin compatibility bridge, not another rule source.

## Ownership

- `AGENTS.md`: durable constraints, routing, and completion gates. No versions,
  test counts, feature inventories, or copied code.
- `.agents/skills/`: one portable workflow per task class. Put conditional
  detail in directly linked `references/` and prefer live code over templates.
- `docs/STATUS.md`: current implementation progress for the owning app.
- ADRs: rationale and history; indexes identify superseded decisions before an
  agent opens them.
- Code, config, generated contracts, and tests: executable truth.

Do not create `agent-skills/`, `prompts/`, `.claude/agents/`, repo-local
`.skills/`, `.codex/skills/`, or standalone `.agent.md` instruction layers.
Machine-local state such as `.claude/settings.local.json` stays ignored.

## Distribution and guards

Edit `.agents/skills/`, then run:

```bash
python scripts/sync_agent_skills.py
python scripts/sync_agent_skills.py --check
```

`scripts/check_agent_governance.py` validates instruction entry points,
portable skill frontmatter, the Copilot bridge, Claude imports, skill sync,
references, commands, and forbidden legacy layers. `scripts/architecture_guard.py`
checks mechanically recognizable application and documentation regressions.
The agent-governance GitHub Actions workflow runs both guards and their tests.

## Changing a durable rule

Use `.agents/skills/agenza-rule-persistence`: fix the concrete instance,
update the owning `AGENTS.md` and skill, amend or add an ADR when architectural,
add a regression test and guard where mechanical enforcement is possible,
confirm CI executes them, and remove obsolete teaching everywhere.

## Adding a skill

1. Confirm the workflow is reusable rather than a one-off prompt.
2. Add `.agents/skills/<name>/SKILL.md` with portable `name` and `description`
   frontmatter only.
3. Keep the body concise and route conditional detail to one-level references.
4. Validate the skill, sync Claude's distribution, run governance tests, and
   update routing only where another agent genuinely needs to discover it.
