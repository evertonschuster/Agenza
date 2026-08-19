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
`README.md` for stack-specific guidance.

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
