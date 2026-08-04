# Agenza

Multi-tenant SaaS platform for service businesses. This polyglot monorepo
contains a React admin frontend, context-aggregated .NET services, and a
FastAPI boundary for AI capabilities.

| Path | Purpose |
| --- | --- |
| `apps/admin-frontend` | Vite + React + strict TypeScript admin UI |
| `backend` | ASP.NET Core services and the Aspire AppHost |
| `ai-services` | Python/FastAPI AI service boundaries |
| `infra` | PostgreSQL initialization for local orchestration |
| `docs` | Current layout, quality, vision, and decision indexes |

## Run the full stack

Prerequisites come from the repository pins (`.nvmrc`, `packageManager`,
`backend/global.json`, `.python-version`, and lock files).

```bash
npm install
dotnet tool restore --tool-manifest backend/.config/dotnet-tools.json
dotnet run --project backend/AppHost --launch-profile http
```

Aspire is the canonical local orchestration path. It starts PostgreSQL, the .NET
services, the admin frontend, and the assistant service. Stack-specific commands
remain in each area README.

## Where to look

- Current structure and local configuration: [docs/MONOREPO.md](docs/MONOREPO.md)
- Product/architecture direction: [docs/VISION.md](docs/VISION.md)
- CI and coverage: [docs/QUALITY.md](docs/QUALITY.md)
- Agent-assisted workflow: [docs/SDD-GUIDE.md](docs/SDD-GUIDE.md)
- Repository instructions: [AGENTS.md](AGENTS.md)

Do not infer versions, feature status, or contracts from this README. Their
executable or living sources are routed by `AGENTS.md`.
