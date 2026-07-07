# Admin Panel — Monorepo

Multi-tenant SaaS admin panel for small healthcare/wellness businesses. Polyglot
monorepo: React frontend, .NET backend microservices, Python AI services.

## Layout

| Path                    | Stack                         | Purpose                                          |
| ------------------------ | ------------------------------ | -------------------------------------------------- |
| `apps/admin-frontend`    | Vite + React 19 + TS (strict)  | The admin panel UI                                |
| `backend`                | .NET 10 (ASP.NET Core)         | Business microservices, one per bounded context   |
| `ai-services`             | Python 3.14 (FastAPI)           | AI/ML services                                    |
| `packages/shared-types`  | TypeScript                     | DTOs/types shared across Node workspaces          |
| `infra`                  | Docker Compose                 | Local multi-stack orchestration                   |

See [docs/MONOREPO.md](docs/MONOREPO.md) for conventions, and each stack's own
`CLAUDE.md`/`README.md` for stack-specific guidance.

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

Node 22.18, npm 10.9, .NET SDK 10.0, Python 3.14, Docker 29.5.
