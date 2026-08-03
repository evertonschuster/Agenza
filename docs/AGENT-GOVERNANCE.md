# AI agent governance

The repository has one instruction source per responsibility and uses
progressive disclosure so an agent reads only what its task needs.

## Instruction stack

```text
AGENTS.md                         durable repo-wide rules and routing
├── backend/AGENTS.md             durable backend rules
├── apps/admin-frontend/AGENTS.md durable frontend rules
├── agent-skills/*                task workflows and conditional references
├── docs/adr/README.md            current/superseded decision routing
└── living docs/config/code       current state and executable truth

agent-skills/ --sync--> .agents/skills/ and .claude/skills/
```

`CLAUDE.md` files are thin tool-specific imports. Repository-local `.skills/`
directories and standalone `.agent.md` instruction files are prohibited; they
previously created parallel sources that drifted independently.

## Ownership rules

- `AGENTS.md`: durable constraints, completion gates, and links deciding what
  to read next. No versions, test counts, feature inventories, or copied code.
- `agent-skills/`: one canonical workflow per task class. A skill may route to
  `references/`, but references are conditional rather than all mandatory.
- `docs/STATUS.md`: current implementation progress for the owning app.
- ADRs: rationale and decision history. Each ADR has a status; the ADR index
  identifies superseded decisions before an agent opens them.
- Code/config/generated contracts/tests: executable truth. When prose and code
  disagree, investigate and repair the prose rather than coding to an obsolete
  example.
- `prompts/`: reusable blank templates only. Completed task prompts belong in
  Git history, not the active corpus.
- Generated analysis output is not committed. Regenerate it locally when
  needed and keep it ignored.

## Canonical skills

| Skill | Purpose |
| --- | --- |
| `agenza-backend-use-case` | Add/change backend business behavior |
| `agenza-backend-new-service` | Create a new business-context service |
| `agenza-frontend-feature` | Change frontend behavior, routed to API/test/UI references |
| `agenza-exception-flow-audit` | Classify backend exception flows |
| `agenza-architecture-review` | General architecture review |
| `agenza-rule-persistence` | Persist corrections across teaching and enforcement |
| `agenza-api-contract-review` | Audit backend/frontend contract drift |
| `agenza-tenant-isolation-review` | Audit multi-tenant isolation |
| `agenza-migration-safety` | Author/review schema changes safely |
| `evolve-modular-architecture` | Decide/evolve module and service boundaries |
| `split-large-coderabbit-pr` | Split a PR only when review limits require it |

## Distribution

`agent-skills/` is the only editable source. Run:

```bash
python scripts/sync_agent_skills.py
python scripts/sync_agent_skills.py --check
```

The script copies every file by content hash to `.agents/skills/` and
`.claude/skills/`. Do not hand-edit distributions and do not add a
`.codex/skills` directory. Copies are committed so each supported tool can
discover skills without setup-time generation.

## Guards

- `scripts/sync_agent_skills.py --check`: canonical/distribution equality.
- `scripts/check_agent_governance.py`: required entry points, portable skill
  frontmatter, resolved references/commands, and absence of legacy instruction
  layers or known reverted teaching patterns.
- `scripts/architecture_guard.py`: application and Markdown code-block patterns
  whose reintroduction would violate accepted architecture.

The same checks run from documented agent commands, Claude's Stop hook, and
`.github/workflows/agent-governance.yml`. The workflow also runs their unit
tests. Structural guards cannot prove every sentence semantically correct, so
reviews still compare living docs with code.

## Updating a rule

Use `agenza-rule-persistence`: fix the concrete instance, update the correct
`AGENTS.md` and canonical skill/reference, amend or add an ADR if architectural,
add a regression test and mechanical guard where possible, confirm CI runs it,
and remove every obsolete prompt/example/instruction layer.

## Creating a skill

1. Confirm the workflow is reusable and not better expressed as a short
   reference inside an existing skill.
2. Add `agent-skills/<name>/SKILL.md` with portable `name` and `description`
   frontmatter.
3. Put large or conditional material under `references/`; state exactly when
   each reference is required.
4. Prefer live repository files over copied implementation templates.
5. Sync, run governance tests/checks, and update the canonical-skill table.

## Tool-specific surface

- Claude Code reads thin `CLAUDE.md` imports, `.claude/skills/`, and optional
  `.claude/agents/` reviewers.
- Codex reads `AGENTS.md` and `.agents/skills/`.
- Neither tool-specific directory owns business or architecture rules.
