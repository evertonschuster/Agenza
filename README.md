# Admin Panel — Monorepo

Multi-tenant SaaS admin panel for small healthcare/wellness businesses. Polyglot
monorepo: React frontend, .NET backend microservices, Python AI services.

## Layout

| Path                  | Stack                         | Purpose                                         |
| --------------------- | ----------------------------- | ----------------------------------------------- |
| `apps/admin-frontend` | Vite + React + strict TypeScript | The admin panel UI                           |
| `backend`             | ASP.NET Core                     | Context-aggregated business services          |
| `ai-services`         | Python + FastAPI                  | AI/ML services                                |
| `infra`               | PostgreSQL init scripts       | Local database roles and schema grants          |

See [docs/MONOREPO.md](docs/MONOREPO.md) for conventions, and each stack's own
`README.md` for stack-specific guidance. Frontend environment setup — prerequisites,
the Aspire-only run path, seeded demo login, and the two build gotchas — is in
[apps/admin-frontend/README.md](apps/admin-frontend/README.md).

## Quickstart

```bash
# Frontend — note it needs the Aspire orchestrator for its six VITE_* variables;
# see apps/admin-frontend/README.md before running it standalone.
npm install
npm run dev:frontend

# Backend (.NET)
dotnet tool restore --tool-manifest backend/.config/dotnet-tools.json
dotnet build backend/AdminBackend.slnx
dotnet run --project backend/services/services-service/ServicesService.Api

# AI services (Python)
cd ai-services/assistant-service
pip install uv
uv sync --frozen --extra dev
uv run uvicorn app.main:app --reload --port 8001

# Everything together (frontend, backend, PostgreSQL, and AI service)
dotnet run --project backend/AppHost --launch-profile http
```

## Tool versions

Use the repository pins instead of copying versions from documentation:
`.nvmrc`/`packageManager`, `backend/global.json`, `.python-version`/`uv.lock`,
and the CI setup actions are the executable sources. Compatibility exceptions
and upgrade conditions are recorded in
[ADR 0032](docs/adr/0032-stable-runtime-and-toolchain-compatibility-pins.md).

## AI coding agents

[`AGENTS.md`](AGENTS.md) is the tool-independent entry point; Codex reads it natively,
`CLAUDE.md` imports it, and `.github/copilot-instructions.md` bridges Copilot to it.
Repository-specific workflows live in `.claude/skills/agenza-*/`.

These files **point at** the sources of truth rather than restating them — versions, file
inventories, and feature status stay in lockfiles, code, and ADRs. That constraint is the
lesson of the abandoned
[ADR 0016](docs/adr/0016-ai-agent-governance-framework.md), recorded in
[ADR 0041](docs/adr/0041-ai-instruction-files-reinstated.md).

[`.mcp.json`](.mcp.json) declares four optional MCP servers (GitHub, shadcn, Playwright,
Chrome DevTools). None is required to develop; authorize them with `claude mcp list` in an
interactive session.
