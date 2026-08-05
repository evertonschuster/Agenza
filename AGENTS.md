# Agenza monorepo — agent instructions

This is the canonical tool-independent entry point. Keep repository-wide,
durable rules here. Area-specific rules live in the nearest `AGENTS.md`.

## Load the minimum context

For a normal task, read only:

1. this file;
2. the nearest area `AGENTS.md`;
3. one matching skill under `.agents/skills/`;
4. the live code, tests, config, migrations, or generated contract involved.

Open additional living documentation only when the task needs it. Never preload
all skills or the full documentation tree.

When sources disagree, use this order:

1. security and tenant-isolation rules in the nearest `AGENTS.md`;
2. executable truth: code, tests, config, migrations, generated contracts;
3. living docs such as `STATUS.md`, `API.md`, and `MONOREPO.md`;
4. frontend ADRs only when a frontend task is explicitly routed to them.

| Need | Read |
| --- | --- |
| Backend rules | `backend/AGENTS.md` |
| Admin frontend rules | `apps/admin-frontend/AGENTS.md` |
| Current layout | `docs/MONOREPO.md` |
| Product direction | `docs/VISION.md` |
| CI and coverage | `docs/QUALITY.md` |
| Frontend decisions | `apps/admin-frontend/docs/adr/README.md` when relevant |
| Agent workflow | `docs/SDD-GUIDE.md` |
| Governance | `docs/AGENT-GOVERNANCE.md` |

## Question policy

Search the repository before asking. Ask only when the missing answer would
materially change a business rule, public contract, authentication or tenant
behavior, production data migration, or an incompatible architectural choice.
Do not invent requirements. Complete independent work while an answer is open.

## Non-negotiables

- **Tenant isolation:** tenant-scoped behavior is bound to the authenticated
  principal. Client-supplied tenant identity is never trusted alone. Any
  observable cross-tenant exposure is a security failure.
- **Service boundaries:** each app/service owns its domain and persistence.
  Cross-service interaction uses explicit HTTP/event contracts, never internal
  project references, shared table writes, or in-process shortcuts.
- **Aspire is the local orchestrator:** evolve `backend/AppHost/AppHost.cs`.
  Do not add a parallel Compose/Dockerfile runtime without an approved deployment design.
- **Expected backend outcomes are values:** validation, not-found, conflict,
  in-use, and authorization use `Result`/`DomainResult`/`PersistenceResult`.
  Exceptions are for unexpected technical failures and narrow documented
  boundaries.
- **No speculative architecture:** implement the smallest complete behavior
  justified by current requirements and repository evidence.

## Quality and documentation

Run every applicable build, format, lint, test, coverage, contract, migration,
and governance gate. Fix causes; never weaken a rule, threshold, test, or
allowlist merely to obtain green output.

Update the source that owns a fact:

- feature progress: owning `STATUS.md`;
- contract policy: generated contract plus owning `API.md` when needed;
- current layout/runtime: config and `docs/MONOREPO.md`;
- durable frontend rationale: the frontend ADR index when needed;
- reusable agent workflow: one canonical skill.

Do not copy versions, file inventories, test counts, current feature status, or
historical narratives into instruction files.

## Git workflow

`main` is the only long-lived branch. Task branches start from current
`origin/main`, use `<type>/<slug>`, rebase before review, and squash-merge.
Concurrent work uses isolated worktrees. Never overwrite unrelated changes or
rewrite published history.

## Skills and rule persistence

`.agents/skills/` is the only editable repository skill source. Claude's
`.claude/skills/` tree is generated; never edit it directly.

After changing a skill:

```bash
python scripts/sync_agent_skills.py
python scripts/sync_agent_skills.py --check
```

When a correction establishes a durable reusable rule, use
`.agents/skills/agenza-rule-persistence` to update the smallest applicable
instruction, code/test, and guard surface. Do not persist one-off task detail.

## Mandatory commands

```bash
# Repository governance — always
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py

# Backend, when backend/** changed
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx

# Frontend, when apps/admin-frontend/** changed
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
```

A task is complete only when applicable gates are green, documentation remains
truthful, and unresolved risk is reported explicitly.
