# Agenza — instructions for agents

The shared entry point. It holds invariants and routing; everything else lives in the code, in each
area's guides and in the [decisions](docs/decisions/). If you feel like pasting code or a file list
here, add a link instead.

## The product

Multi-tenant SaaS for small service businesses in Brazil (clinics, beauty, massage, salons):
scheduling, client management and an AI receptionist. v1 persona: the owner-operator.

**User-facing text is pt-BR. Code identifiers are English.** Key names are not translated.

## Where things are

| Path                  | Stack                                | Read first                                                                                                                                                       |
| --------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/admin-frontend` | Vite + React + strict TypeScript     | [local AGENTS.md](apps/admin-frontend/AGENTS.md)                                                                                                                 |
| `backend`             | .NET, Clean Architecture per service | [local AGENTS.md](backend/AGENTS.md)                                                                                                                             |
| `ai-services`         | Python + FastAPI                     | [ai-services/assistant-service/README.md](ai-services/assistant-service/README.md)                                                                               |
| `infra`               | PostgreSQL init scripts              | —                                                                                                                                                                |
| `docs/decisions`      | The why and rejected alternatives    | [processo](docs/decisions/processo.md), [plataforma](docs/decisions/plataforma.md), [backend](docs/decisions/backend.md), [frontend](docs/decisions/frontend.md) |

Local environment and quality gates: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md). Product direction:
[docs/VISION.md](docs/VISION.md).

## Rules that apply across the repository

**Multi-tenancy is a server boundary.** The tenant comes only from the validated token's claim; the
`X-Tenant-Id` header is routing and the backend refuses a mismatch. Never accept a tenant from a URL,
a query or `localStorage`. [decisions/plataforma.md](docs/decisions/plataforma.md).

**Errors are values, not exceptions.** An expected failure returns a `Result`; only the exceptional
throws. [decisions/backend.md](docs/decisions/backend.md).

**No "what" comments, no JSDoc.** A short "why" comment only for a genuine race or a non-obvious
constraint.

**Abstraction proportional to the problem.** Lean plumbing, invested domain structure.

**Versions come from the pins**, never from documentation: `.nvmrc`, `packageManager`,
`backend/global.json`, `.python-version`, `uv.lock` and the CI setup actions.

**Aspire is the only local orchestrator.** Do not add Docker to the frontend.
[decisions/plataforma.md](docs/decisions/plataforma.md).

## Documentation

Write only what the code does not show, and every fact has one home:
[decisions/processo.md](docs/decisions/processo.md). Do not create numbered ADRs; an approved
decision becomes a section in its theme file. A new file in `docs/decisions/` only comes from
splitting a theme above 150 lines, as `processo.md` describes. An owner correction that holds beyond
the session goes into this AGENTS or the area guide, in the same PR; a host's private memory keeps
only facts about the machine or the PR in flight.

## Workflow

The single round of questions before coding, acceptance criteria as pt-BR-named tests and review
commits follow the [process](docs/decisions/processo.md). A feature that spans backend and frontend
is two PRs, the backend one first, with the regenerated OpenAPI types.

Work goes through a PR, on a short branch cut from `main`. Never commit directly to `main`, and never
merge, push, auto-merge or revert on it without the owner's explicit OK on that PR.

On the owner's machine the main checkout is shared between sessions: check the branch before any git
write and work in your own worktree.

A question asks for an answer, not a change. The scope is the request; a finding outside it becomes
one line in the report.

## Skills

Before a task that matches a row, open that skill, even when the host did not load it on its own.
Every skill is listed here; `check:docs` fails when one is missing.

| Task                                               | Skill                                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------------- |
| Backend use case, entity, migration, endpoint      | [agenza-backend-slice](.claude/skills/agenza-backend-slice/SKILL.md)       |
| Backend review (revisar PR)                        | [agenza-backend-review](.claude/skills/agenza-backend-review/SKILL.md)     |
| Tenant, login, session, token                      | [agenza-tenant-isolation](.claude/skills/agenza-tenant-isolation/SKILL.md) |
| Contract, generated types, repository, API failure | [agenza-api-contract](.claude/skills/agenza-api-contract/SKILL.md)         |
| Frontend screen, page, list, route (tela, página)  | [agenza-frontend-slice](.claude/skills/agenza-frontend-slice/SKILL.md)     |
| Form, validation, field error (formulário)         | [agenza-form-field](.claude/skills/agenza-form-field/SKILL.md)             |
| Shared component, theme, color, focus              | [agenza-ui-primitive](.claude/skills/agenza-ui-primitive/SKILL.md)         |
| Copy, messages, dates, numbers, money (texto)      | [agenza-ptbr-copy](.claude/skills/agenza-ptbr-copy/SKILL.md)               |
| Frontend tests, coverage, e2e                      | [agenza-testing](.claude/skills/agenza-testing/SKILL.md)                   |

Skills live only in `.claude/skills/agenza-*/`. Claude Code and Copilot discover them there; Codex
reaches them through this table. This is the only skill table; area guides point here.

## How each tool gets here

| Tool           | Path                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| Codex          | Discovers AGENTS through the directory hierarchy; reaches skills through the table    |
| Claude Code    | `CLAUDE.md` imports this file; discovers skills in `.claude/skills`                   |
| GitHub Copilot | The bridge in `.github/copilot-instructions.md`; discovers skills in `.claude/skills` |

## Validation and delivery

Choose tests by the behavior and risk changed, keeping the gates in
[DEVELOPMENT](docs/DEVELOPMENT.md). For a documentation-only change, check references, formatting
and the diff; do not create application tests to validate wording. Record runs and limits in the PR.

On the owner's machine, do not stop a process or container you did not start: the fixed ports in
[DEVELOPMENT](docs/DEVELOPMENT.md) usually belong to the Aspire stack the owner is using.
