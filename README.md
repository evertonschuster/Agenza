# Admin Panel — Monorepo

Multi-tenant SaaS admin panel for small healthcare/wellness businesses. Polyglot
monorepo: React frontend, .NET backend microservices, Python AI services.

## Layout

| Path                  | Stack                         | Purpose                                         |
| --------------------- | ----------------------------- | ----------------------------------------------- |
| `apps/admin-frontend` | Vite + React 19 + TS (strict) | The admin panel UI                              |
| `backend`             | .NET 10 (ASP.NET Core)        | Business microservices, one per bounded context |
| `ai-services`         | Python 3.14 (FastAPI)         | AI/ML services                                  |
| `infra`               | PostgreSQL init scripts       | Local database roles and schema grants          |

See [docs/MONOREPO.md](docs/MONOREPO.md) for conventions, and each stack's own
`CLAUDE.md`/`README.md` for stack-specific guidance.

This repo is built AI-first: the docs are the spec, agents execute, CI
verifies. **[docs/SDD-GUIDE.md](docs/SDD-GUIDE.md)** is the developer
guide — the workflow, worked example prompts, and what stays human.

## Quickstart

```bash
# Frontend
npm install
npm run dev:frontend

# Backend (.NET)
dotnet tool restore --tool-manifest backend/.config/dotnet-tools.json
dotnet build backend/AdminBackend.slnx
dotnet run --project backend/services/services-service/ServicesService.Api

# AI services (Python)
cd ai-services/assistant-service
pip install uv==0.11.32
uv sync --frozen --extra dev
uv run uvicorn app.main:app --reload --port 8001

# Everything together (frontend, backend, PostgreSQL, and AI service)
dotnet run --project backend/AppHost --launch-profile http
```

## Versions

| Stack  | Minimum supported (CI-gated)                                 | Recommended local/runtime                    |
| ------ | ------------------------------------------------------------ | -------------------------------------------- |
| Node   | 26.5.1 (`.nvmrc`, `engines.node`)                            | Same — `nvm use` picks it up automatically   |
| npm    | 12.0.2 (`packageManager`)                                    | Same                                         |
| .NET   | 10.0.302 (`backend/global.json`, `rollForward: latestPatch`) | Same                                         |
| Python | 3.14.6 (`requires-python`, CI)                               | 3.14.6 (`.python-version`, `uv.lock`)        |
| Docker | 29.5                                                         | Same (container runtime for Aspire Postgres) |

Runtime and package-manager pins are aligned across local development and CI.
TypeScript and Microsoft.OpenApi intentionally remain on their latest
compatible stable lines; [ADR 0032](docs/adr/0032-stable-runtime-and-toolchain-compatibility-pins.md)
records the upgrade conditions.
