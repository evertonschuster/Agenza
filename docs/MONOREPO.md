# Monorepo structure

```
admin/
├── apps/
│   └── admin-frontend/     Vite + React 19 + TypeScript admin panel (see its own docs/)
├── backend/
│   ├── AdminBackend.slnx   .NET solution (dotnet 10 uses .slnx, not .sln)
│   ├── AppHost/            .NET Aspire orchestrator — local dev only, see below
│   ├── ServiceDefaults/    shared OpenTelemetry/health-check/service-discovery wiring
│   └── services/
│       └── services-service/   reference microservice — copy this layout for new services
├── ai-services/
│   └── assistant-service/  placeholder Python/FastAPI AI service
├── packages/
│   └── shared-types/       TS types/DTOs shared across Node workspaces
├── infra/
│   └── docker-compose.yml  local multi-stack orchestration
└── docs/                   monorepo-level docs only — app/service-specific docs live
                             inside that app/service's own folder
```

## Local development

Two ways to run the full stack (frontend, both .NET services, assistant-service,
Postgres) together locally:

- **`dotnet run --project backend/AppHost`** (recommended) — .NET Aspire starts
  every resource with one command and opens a dashboard (URL printed on
  startup) with live logs, traces, and health across all five resources.
  Ports are pinned to match `docker-compose`'s (5081/5080/8001/5173) since
  identity-service's `Identity:PublicIssuer` and CORS origin are fixed to
  those values. Requires Docker running (Postgres) and Node/Python deps
  already installed (`npm install` at root, the assistant-service `.venv`).
  Set the one local secret once: `dotnet user-secrets set
  "Parameters:assistant-worker-secret" "<value>" --project backend/AppHost`.
- **`docker-compose -f infra/docker-compose.yml up`** — fully containerized,
  no .NET/Node/Python toolchain required on the host. Still the option to
  reach for if you don't have the SDKs installed, or want production-like
  container builds.

Aspire is local-dev tooling only here — it doesn't change how any service is
built, tested, or deployed; `AppHost`/`ServiceDefaults` are not referenced by
any `*.Tests.csproj` and aren't part of the CI or Docker image build paths.

## Adding a new backend microservice

1. Copy the layout of `backend/services/services-service/` (Domain, Application,
   Infrastructure, Api, Tests projects).
2. `dotnet sln backend/AdminBackend.slnx add <new project paths>`.
3. Wire references so Domain has zero deps, Application → Domain,
   Infrastructure → Application, Api → Application + Infrastructure.
4. Add it to `infra/docker-compose.yml` once it has a Dockerfile, pointing
   `ConnectionStrings__Default` at the shared `postgres` service
   (`Host=postgres;Database=appdb;...`) - don't add a new database container.
5. If the service persists data, call `modelBuilder.HasDefaultSchema("<service-name>")`
   in its `DbContext.OnModelCreating` (see `IdentityDataContext` for the
   pattern). Every microservice shares one Postgres instance/database but
   owns its own schema, so migrations never collide with another service's
   tables.

## Adding a new AI service

1. Copy `ai-services/assistant-service/` (pyproject.toml, app/, tests/).
2. Give it its own venv — Python services are NOT part of an npm/dotnet workspace.

## npm workspaces

Root `package.json` declares `apps/*` and `packages/*` as npm workspaces. Only the
JS/TS side is workspace-managed; .NET and Python projects are self-contained and use
their own native tooling (`dotnet`, `pip`/venv).

## Known gaps (tracked, not blocking)

- Husky git hooks live under `apps/admin-frontend/.husky/` but git root is now the
  monorepo root — hooks won't fire until Husky is reconfigured from the root
  (`npx husky init` at root + a root lint-staged config that delegates per workspace).
- `apps/admin-frontend/graphify-out/` is stale (generated before the restructure) —
  regenerate rather than trust it.
