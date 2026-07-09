# Monorepo structure

```
admin/
├── apps/
│   └── admin-frontend/     Vite + React 19 + TypeScript admin panel (see its own docs/)
├── backend/
│   ├── AdminBackend.slnx   .NET solution (dotnet 10 uses .slnx, not .sln)
│   ├── AppHost/            .NET Aspire orchestrator — local dev only, see below
│   ├── ServiceDefaults/    shared OpenTelemetry/health-check/service-discovery wiring
│   ├── shared/
│   │   └── Admin.Identity.Client/  JWT validation + ITenantAccessor for resource services
│   └── services/
│       ├── identity-service/   OIDC provider (OpenIddict) — the reference implementation
│       └── services-service/   template layout — copy its structure, but mirror
│                               identity-service's patterns for real content
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

Follow `backend/.skills/backend-new-microservice/SKILL.md` — it covers the
full checklist (layout, solution wiring, auth via Admin.Identity.Client,
shared-Postgres schema convention, Docker/Aspire, CI, docs). The short
version: copy the five-project layout, mirror identity-service's patterns,
one schema per service in the shared Postgres.

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
