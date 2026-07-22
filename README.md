# Admin Panel — Monorepo

Multi-tenant SaaS admin panel for small healthcare/wellness businesses. Polyglot
monorepo: React frontend, .NET backend microservices, Python AI services.

## Layout

| Path                    | Stack                         | Purpose                                          |
| ------------------------ | ------------------------------ | -------------------------------------------------- |
| `apps/admin-frontend`    | Vite + React 19 + TS (strict)  | The admin panel UI                                |
| `backend`                | .NET 10 (ASP.NET Core)         | Business microservices, one per bounded context   |
| `ai-services`             | Python 3.14 (FastAPI)           | AI/ML services                                    |
| `infra`                  | Docker Compose                 | Local multi-stack orchestration                   |

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
dotnet build backend/AdminBackend.slnx
dotnet run --project backend/services/services-service/ServicesService.Api

# AI services (Python)
cd ai-services/assistant-service
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001

# Everything together
docker compose -f infra/docker-compose.yml up
```

## Versions

| Stack  | Minimum supported (CI-gated)                        | Recommended local/runtime                         |
| ------ | ---------------------------------------------------- | -------------------------------------------------- |
| Node   | 22.22.1 (`.nvmrc`, `engines.node`)                    | Same — `nvm use` picks it up automatically          |
| npm    | 10.9.3 (`packageManager`)                             | Same                                                |
| .NET   | 10.0.302 (`backend/global.json`, `rollForward: latestPatch`) | Same                                         |
| Python | 3.12 (`requires-python`, CI)                          | 3.14 (`.python-version`, Docker) — newer runtime is fine, the package itself only requires 3.12+ |
| Docker | 29.5                                                  | Same                                                |

Node was previously documented as 22.18 while `react-router`/`lint-staged`
already required >=22.22 — `.nvmrc`/`engines.node` now enforce the real
floor everywhere (local, Docker, CI) instead of letting them silently
disagree.
