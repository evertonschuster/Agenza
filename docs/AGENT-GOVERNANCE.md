# AI agent governance

The repository uses progressive disclosure: one durable instruction source per
scope and one portable workflow per repeatable task.

## Canonical stack

```text
AGENTS.md                           repository rules and context routing
├── backend/AGENTS.md               backend-only constraints
├── apps/admin-frontend/AGENTS.md   frontend-only constraints
├── .agents/skills/*                task workflows and optional references
├── */docs/STATUS.md, API.md        living state and integration policy
├── apps/admin-frontend/docs/adr/README.md  frontend decision routing
└── code, config, tests             executable truth

.agents/skills/ --sync--> .claude/skills/
```

A normal task loads the root instructions, the nearest area instructions, one
matching skill, and the live files involved. It does not preload the entire
documentation tree.

## Ownership

- `AGENTS.md`: durable constraints, precedence, routing, and completion gates.
- `.agents/skills/`: reusable task workflows. Conditional detail may live in a
  directly linked `references/` file. The approved project-specific catalogue
  is enforced by `scripts/check_agent_governance.py`; adding a skill is a
  governance change, not a convenient place for generic advice.
- `STATUS.md`: current implementation progress.
- Frontend ADRs: scoped rationale for the admin frontend only.
- Code, config, migrations, generated contracts, and tests: executable truth.

Do not add parallel instruction trees such as `agent-skills/`, `prompts/`,
`.claude/agents/`, `.skills/`, `.codex/skills/`, or standalone `.agent.md`
files. Machine-local settings remain ignored.

## Tool bridges

- Claude reads import-only `CLAUDE.md` files and the generated
  `.claude/skills/` distribution.
- GitHub Copilot reads the thin `.github/copilot-instructions.md` bridge.
- `.agents/skills/` is always the editable source.

After a canonical skill change, run:

```bash
python scripts/sync_agent_skills.py
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
```

`scripts/architecture_guard.py` checks recognizable application/documentation
regressions. The governance workflow runs these checks and their tests.

## Change policy

Persist only reusable rules. Update the smallest applicable `AGENTS.md` or
skill, fix the concrete code/documentation, add a frontend ADR only for a
durable frontend choice, and add a regression test/guard when the rule is
mechanically verifiable. Remove superseded teaching instead of preserving it in
an active instruction layer.
