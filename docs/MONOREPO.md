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
│   │   ├── Admin.Identity.Client/       JWT validation + ITenantAccessor for resource services
│   │   ├── Admin.SharedKernel/          CQRS/Result-pattern kernel (docs/adr/0005) — Result,
│   │   │                                ICommand/IQuery + handlers, IDispatcher; framework-agnostic
│   │   └── Admin.SharedKernel.AspNetCore/  Result → IActionResult mapping + the generic
│   │                                        exception handler (docs/adr/0018) — only .Api
│   │                                        projects reference this one
│   └── services/
│       ├── identity-service/   OIDC provider (OpenIddict), tenants, users, M2M tokens
│       └── services-service/   the business's offerings — Tags,
│                               Categories, and Services verticals
├── ai-services/
│   └── assistant-service/  placeholder Python/FastAPI AI service
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

## Git hooks

Husky lives at the repo root (`.husky/`, installed by the root `prepare`
script). The pre-commit hook runs each workspace's lint-staged from
inside that workspace — add a line to `.husky/pre-commit` when a new
workspace gains a lint-staged config.

## Known gaps (tracked, not blocking)

- `apps/admin-frontend/graphify-out/` is stale (generated before the restructure) —
  regenerate rather than trust it.
- `ServicesService.Api`/`IdentityService.Api` each run EF Core migrations from
  an `IHostedService` (`DatabaseMigrator`/`DatabaseSeeder`) on startup, guarded
  by a `Migrations:RunOnStartup` config flag (defaults to `true`). This is fine
  for local dev (`dotnet run`/Aspire) and for the current single-container
  `docker-compose` setup — there's no evidence yet of a multi-replica
  production deployment (no k8s manifests, no CD pipeline in this repo as of
  2026-07). If/when one is introduced, set `Migrations:RunOnStartup=false` for
  that environment and run migrations as a dedicated job/step in the
  deployment pipeline instead — N replicas starting concurrently with the flag
  left on would race to apply the same migration. Prefer that dedicated step
  over adding ad hoc locking here, since the right mechanism depends on the
  orchestrator chosen.
- If you already ran `docker compose up` or `dotnet run --project
  backend/AppHost` before docs/adr/0017 landed, your local Postgres
  volume has migration history recorded in `public.__EFMigrationsHistory`
  shared by both services. The next startup will try to re-apply every
  migration against the new schema-scoped history tables and fail loudly
  (`relation already exists`) until you follow the one-time runbook in
  docs/adr/0017 (drop the local dev volume, or manually split the table).
- Both services connect as the same Postgres superuser (`ConnectionStrings__Default`,
  `postgres`/`postgres` in both `infra/docker-compose.yml` and Aspire's
  `.WithDataVolume()` resource) — schema-per-service (docs/adr/0002) is
  enforced by convention/review only, not by Postgres grants; nothing
  technically stops identity-service's connection from querying
  `services.*` or vice versa. A follow-up worth doing: one least-privilege
  Postgres role per service, granted only on its own schema. Not applied
  as part of docs/adr/0017/0018 — it needs real credential/secrets
  handling for both `docker-compose` and Aspire's Postgres resource, which
  is its own piece of infra work, not a drive-by change alongside a
  migrations-history fix.
