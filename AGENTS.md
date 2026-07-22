# Admin Panel Monorepo — Agent Instructions

This is the canonical, tool-independent instruction file for every AI coding
agent working in this repository (Claude Code, OpenAI Codex, or any other
agent that reads `AGENTS.md`). It holds only durable, repo-wide rules.
Area-specific rules live in the local files linked below — read this file
first, then the one for the area you're touching.

## What this repo is

A multi-tenant SaaS admin panel for small healthcare/wellness businesses:
React frontend, .NET microservices, Python AI services. See
[docs/VISION.md](docs/VISION.md) for where it's heading and
[docs/MONOREPO.md](docs/MONOREPO.md) for the layout that exists today.

## Read next (in this order)

| Area                                       | Read                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `.NET backend (backend/**)`                | [backend/AGENTS.md](backend/AGENTS.md)                                  |
| `Admin frontend (apps/admin-frontend/**)`  | [apps/admin-frontend/AGENTS.md](apps/admin-frontend/AGENTS.md)          |
| `Python AI service (ai-services/<svc>/**)` | that service's own `README.md`                                          |
| Repo layout & workspace conventions        | [docs/MONOREPO.md](docs/MONOREPO.md)                                    |
| Target architecture                        | [docs/VISION.md](docs/VISION.md)                                        |
| How humans direct agents here (SDD)        | [docs/SDD-GUIDE.md](docs/SDD-GUIDE.md)                                  |
| CI, coverage gates, review tooling         | [docs/QUALITY.md](docs/QUALITY.md)                                      |
| Cross-cutting decisions with rationale     | [docs/adr/](docs/adr/)                                                  |
| How this governance framework works        | [docs/AGENT-GOVERNANCE.md](docs/AGENT-GOVERNANCE.md)                    |

An area's own `AGENTS.md` always wins on anything specific to that area;
this file only covers what applies everywhere.

## Question policy

Before asking the user anything, look for the answer yourself: code, tests,
ADRs, `AGENTS.md`/`CLAUDE.md` files, skills, scripts, workflows,
configuration, OpenAPI contracts, migrations, and repo history all count as
sources of truth before a question does.

Only ask when the answer could plausibly:

- change a business rule,
- change a public contract (API, DTO, event shape),
- affect authentication or authorization,
- compromise multi-tenancy or tenant data isolation,
- modify data already in a production migration,
- or choose between two architecturally incompatible strategies with no
  clear winner in existing code/ADRs.

Do not block independent, unambiguous work on one open question — finish
what you can and flag the question alongside it. Do not invent requirements
that were never stated or implied by the spec/ADRs/code.

## Non-negotiables

- **Tenant scoping.** Every query or command in every service (frontend use
  case, .NET handler, Python endpoint) is scoped to a tenant. A tenant id
  from the client is never trusted on its own — it is always verified
  against the authenticated principal. See backend/AGENTS.md's "Tenant
  scoping" section for the concrete mechanism (`TenantHeaderFilter`,
  `ITenantOwned`, automatic assignment) and
  `agent-skills/agenza-tenant-isolation-review` for how to audit it.
- **Clean Architecture per app/service.** Each app and each backend
  microservice keeps its own Domain → Application → Infrastructure/
  Presentation layering, dependencies pointing inward only. Never reach
  across a service's internals — cross-service contracts go through HTTP
  APIs, never shared database access. (`packages/shared-types` was removed
  as unused while `admin-frontend` is the only Node app — recreate it only
  when a second app needs shared TS DTOs, see docs/VISION.md.)
- **No shared mutable state across stacks.** The frontend, .NET services,
  and Python services talk over HTTP (and later, events) — never shared
  files, multi-service writes to the same database, or in-process calls
  across a service boundary.
- **Exceptions are not conventional control flow.** No layer throws for an
  *expected* outcome — validation failure, not-found, conflict/duplicate,
  in-use, tenant authorization. Every layer's failure signature is explicit
  in its return type (`Result`/`DomainResult`/`PersistenceResult` in the
  backend). Exceptions stay reserved for genuinely unexpected/unrecoverable
  failures. This is not a style preference — it reverts a pattern
  (`BusinessException`/`DuplicateEntityException`/`BusinessExceptionHandler`,
  `MustAsync` repository checks in validators) this codebase already tried,
  hit problems with, and formally reverted (docs/adr/0012, docs/adr/0014).
  Full detail in backend/AGENTS.md; audit with
  `agent-skills/agenza-exception-flow-audit`.

## Testing & quality policy

- Both `build` and `test` must pass for whichever stack you touched before
  calling a change done — see the area's own `AGENTS.md` for exact
  commands. Lint/format gates are equally mandatory, not optional style
  nits.
- Never delete or skip a test, disable a lint rule, shrink a coverage gate,
  or widen an allowlist just to make a gate pass. Fix the underlying issue.
  If a gate is genuinely wrong, that's an ADR-worthy decision, not a silent
  workaround.
- A migration or schema change that could destroy or silently alter
  production data needs `agent-skills/agenza-migration-safety` and, when
  real data loss risk exists, a direct question to the user — this is one
  of the question-policy triggers above, not an exception to it.

## Documentation policy

- A decision another agent (or a human, in six months) might re-litigate
  gets an ADR: `docs/adr/` for cross-cutting decisions,
  `apps/admin-frontend/docs/adr/` for frontend-local ones.
- Docs are updated in the same change that makes them stale (STATUS.md
  rows, API docs, this file, area `AGENTS.md`/`CLAUDE.md` files) — not in a
  follow-up.
- A code comment explains a non-obvious *why* (a security default, a
  library quirk, a subtle ordering/transaction constraint) — never *what*
  the code does, and never rationale that belongs in an ADR instead.

## Rule persistence policy

A correction to an agent, a recurring bug, or a new architectural decision
is **not durable** just because it was said once in a conversation. It only
counts as persisted once it has, wherever applicable:

1. a rule in the right `AGENTS.md` (root or local),
2. an updated skill in `agent-skills/`,
3. an ADR or other doc update,
4. a regression test,
5. an automated guard (`scripts/architecture_guard.py`),
6. a CI gate that enforces it.

When the user corrects an agent, the agent should judge whether the
correction is a one-off or a durable rule, business constraint, or process
improvement. If durable, follow `agent-skills/agenza-rule-persistence`
through that full checklist — including checking `CLAUDE.md` files, older
skills, comments, docs, templates, and tests that might still teach the
superseded pattern.

## Skills

The single editable source of skills is `agent-skills/` (portable
frontmatter: `name` + `description` only, no tool-specific fields). It is
synced — never hand-copied — into `.agents/skills/` (Codex) and
`.claude/skills/` (Claude Code) by `scripts/sync_agent_skills.py`. Run
`python scripts/sync_agent_skills.py --check` after editing anything under
`agent-skills/`; run it without `--check` to actually sync.

## Mandatory commands before calling anything done

```bash
# Governance (always, regardless of what changed)
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py

# Backend, if backend/** changed
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx

# Frontend, if apps/admin-frontend/** changed
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
```

## Completion criteria

A task is done only when every gate that applies to what you touched is
green: build, tests, lint/format, coverage gate, the three governance
scripts above, docs updated (STATUS/ADR/AGENTS.md as applicable), and — for
a durable rule change — the rule-persistence checklist satisfied. Do not
report a task complete while an applicable gate is still red; say what's
red and why instead.
