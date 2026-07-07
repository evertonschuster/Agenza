# Monorepo structure

```
admin/
├── apps/
│   └── admin-frontend/     Vite + React 19 + TypeScript admin panel (see its own docs/)
├── backend/
│   ├── AdminBackend.slnx   .NET solution (dotnet 10 uses .slnx, not .sln)
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

## Adding a new backend microservice

1. Copy the layout of `backend/services/services-service/` (Domain, Application,
   Infrastructure, Api, Tests projects).
2. `dotnet sln backend/AdminBackend.slnx add <new project paths>`.
3. Wire references so Domain has zero deps, Application → Domain,
   Infrastructure → Application, Api → Application + Infrastructure.
4. Add it to `infra/docker-compose.yml` once it has a Dockerfile.

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
- `ServicesService.Api` and `assistant-service` have no Dockerfiles yet —
  `infra/docker-compose.yml` references paths that don't exist until those are added.
- `apps/admin-frontend/graphify-out/` is stale (generated before the restructure) —
  regenerate rather than trust it.
