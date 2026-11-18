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

Agenza skills have a single source in `.claude/skills/agenza-*/`; each area's AGENTS points to the
one for the task. If the host does not discover them, open the file by its path. Do not create
per-host copies or syncing.

## How each tool gets here

| Tool           | Path                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| Codex          | Discovers AGENTS through the directory hierarchy; open the area's when needed |
| Claude Code    | `CLAUDE.md` imports this file                                                 |
| GitHub Copilot | The bridge in `.github/copilot-instructions.md` asks it to read root and area |

## Validation and delivery

Choose tests by the behavior and risk changed, keeping the gates in
[DEVELOPMENT](docs/DEVELOPMENT.md). For a documentation-only change, check references, formatting
and the diff; do not create application tests to validate wording. Record runs and limits in the PR.

On the owner's machine, do not stop a process or container you did not start: the fixed ports in
[DEVELOPMENT](docs/DEVELOPMENT.md) usually belong to the Aspire stack the owner is using.
