# Agenza monorepo — agent instructions

This is the canonical, tool-independent entry point. Keep only durable,
repo-wide rules here; area rules live in `backend/AGENTS.md` and
`apps/admin-frontend/AGENTS.md`. Current state, versions, and historical
rationale belong in code/config, STATUS docs, and indexed ADRs.

## Route context, do not preload it

| Scope | Read next |
| --- | --- |
| Backend | `backend/AGENTS.md` |
| Admin frontend | `apps/admin-frontend/AGENTS.md` |
| Python AI service | that service's README and config |
| Current repo layout | `docs/MONOREPO.md` |
| Target direction | `docs/VISION.md` |
| CI and coverage | `docs/QUALITY.md` |
| Decision rationale | `docs/adr/README.md`, then only the relevant ADRs |
| Human/agent workflow | `docs/SDD-GUIDE.md` |
| Governance mechanics | `docs/AGENT-GOVERNANCE.md` |

Do not read every linked document or ADR by default. Prefer executable truth
(code, tests, generated contracts, migrations, config) over prose describing it.

## Question policy

Search code, tests, ADR indexes, instructions, skills, contracts, migrations,
configuration, scripts, workflows, and history before asking the user.

Ask only when the answer could materially change:

- a business rule or public contract;
- authentication, authorization, or tenant isolation;
- data already represented by a production migration;
- an architecturally incompatible strategy with no clear repository precedent.

Finish independent, unambiguous work while one question remains open. Never
invent requirements absent from the spec or repository evidence.

## Repo-wide non-negotiables

- **Tenant isolation:** every tenant-scoped operation is tied to the
  authenticated principal. Client-supplied tenant identity is never trusted
  alone. Any observable cross-tenant exposure is a security failure.
- **Boundaries:** each app/service owns its Domain -> Application ->
  Infrastructure/Presentation dependencies. Cross-service interaction uses
  explicit HTTP/event contracts, never internal project references or shared
  database writes.
- **No shared mutable state across stacks:** frontend, .NET, and Python
  communicate through service boundaries, not shared files or in-process calls.
- **Aspire is the local orchestrator:** evolve the resource graph in
  `backend/AppHost/AppHost.cs`. Do not add Docker Compose or application
  Dockerfiles as a parallel local runtime without an accepted deployment ADR.
- **Expected backend outcomes are values:** validation, not-found, conflict,
  in-use, and tenant authorization flow through `Result`/`DomainResult`/
  `PersistenceResult`. Exceptions remain for unexpected technical failures and
  the narrow cases documented by backend rules.

## Quality and documentation

- Run build, test, lint/format, and coverage gates for every affected stack.
  Fix the cause; never delete/skip tests, disable a rule, lower a threshold, or
  widen an allowlist merely to pass.
- Update living documentation in the same change that makes it stale. Do not
  duplicate current versions, file inventories, test counts, or feature status
  in instruction files.
- A durable decision that may be re-litigated gets an ADR. Index it as accepted,
  superseded, or historical so agents do not treat incompatible decisions as
  simultaneously current.
- Comments explain a non-obvious why. They do not narrate code or duplicate ADR
  rationale.

## Git workflow

The repository is trunk-based with `main` as its only long-lived branch.

- Direct local commits to `main` are allowed after synchronizing with
  `origin/main`; never rewrite published history.
- A task branch starts from current `origin/main`, uses `<type>/<slug>` where
  type is `feat`, `fix`, `chore`, `docs`, or `refactor`, and is rebased before a
  PR or update. Do not stack it on an unmerged feature branch.
- PRs squash-merge and delete their branch.
- Concurrent agents or humans use isolated worktrees. Never share one working
  directory across simultaneous tasks or overwrite unrelated user changes.

## Rule persistence

When a correction, recurring bug, or review finding establishes a durable rule,
use `agent-skills/agenza-rule-persistence`. Update every applicable layer:

1. concrete code/documentation;
2. the correct `AGENTS.md`;
3. the canonical skill and its references;
4. an ADR when architectural;
5. a regression test;
6. an automated guard when mechanically detectable;
7. the CI path that runs it.

Check prompts, examples, comments, and historical instruction layers for the
superseded teaching. A conversation-only correction is not persisted.

## Skills

`agent-skills/` is the only editable repository skill source. The sync script
copies it verbatim to `.agents/skills/` and `.claude/skills/`; never edit those
distribution directories by hand. Repository-local `.skills/` directories and
standalone `.agent.md` instruction files are prohibited because they create a
second source of truth.

Run `python scripts/sync_agent_skills.py` after changing a canonical skill and
`--check` to verify distributions.

## Mandatory commands

```bash
# Governance — always
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

A task is complete only when every applicable gate is green, documentation is
truthful, and no required work remains. Report any red gate and its cause.
