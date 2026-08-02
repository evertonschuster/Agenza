# Admin Panel — Monorepo

Multi-tenant SaaS admin panel for small healthcare/wellness businesses. Polyglot
monorepo: React frontend, .NET backend microservices, Python AI services.

## Layout

| Path                  | Stack                         | Purpose                                         |
| --------------------- | ----------------------------- | ----------------------------------------------- |
| `apps/admin-frontend` | Vite + React 19 + TS (strict) | The admin panel UI                              |
| `backend`             | .NET 10 (ASP.NET Core)        | Business microservices, one per bounded context |
| `ai-services`         | Python 3.12 (FastAPI)         | AI/ML services                                  |
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
pip install uv==0.11.15
uv sync --frozen --extra dev
uv run uvicorn app.main:app --reload --port 8001

# Everything together (frontend, backend, PostgreSQL, and AI service)
dotnet run --project backend/AppHost --launch-profile http
```

## Versions

| Stack  | Minimum supported (CI-gated)                                 | Recommended local/runtime                    |
| ------ | ------------------------------------------------------------ | -------------------------------------------- |
| Node   | 22.22.1 (`.nvmrc`, `engines.node`)                           | Same — `nvm use` picks it up automatically   |
| npm    | 10.9.3 (`packageManager`)                                    | Same                                         |
| .NET   | 10.0.302 (`backend/global.json`, `rollForward: latestPatch`) | Same                                         |
| Python | 3.12 (`requires-python`, CI)                                 | 3.12 (`.python-version`, `uv.lock`)          |
| Docker | 29.5                                                         | Same (container runtime for Aspire Postgres) |

Node was previously documented as 22.18 while the frontend toolchain already
required >=22.22 — `.nvmrc`/`engines.node` now enforce the real floor
everywhere (local and CI) instead of letting them silently disagree.
