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
  Set the four local secrets once:

  ```bash
  dotnet user-secrets set "Parameters:identity-db-password" "<value>" --project backend/AppHost
  dotnet user-secrets set "Parameters:services-db-password" "<value>" --project backend/AppHost
  dotnet user-secrets set "Parameters:assistant-worker-secret" "<value>" --project backend/AppHost
  dotnet user-secrets set "Parameters:tenant-provisioning-secret" "<value>" --project backend/AppHost
  ```

  AppHost passes the same worker secret to the identity provider and the
  assistant, so client-credentials authentication cannot drift between them.

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
- Database bootstrap is opt-in through
  `DatabaseBootstrap:RunOnStartup` (base configuration is `false`;
  Development and the demo Compose stack explicitly enable it). When
  enabled, each service holds a PostgreSQL advisory lock across its
  migration/seed window. A future multi-replica deployment should still
  run the same chain as a one-shot bootstrap before starting replicas;
  the repository intentionally has no production deployment design yet
  (docs/adr/0025).
- If you already ran `docker compose up` or `dotnet run --project
backend/AppHost` before docs/adr/0017 landed, your local Postgres
  volume has migration history recorded in `public.__EFMigrationsHistory`
  shared by both services. The next startup will try to re-apply every
  migration against the new schema-scoped history tables and fail loudly
  (`relation already exists`) until you follow the one-time runbook in
  docs/adr/0017 (drop the local dev volume, or manually split the table).
- Compose and Aspire initialize separate non-superuser roles:
  `identity_app` owns only the `identity` schema and `services_app` owns
  only the `services` schema. Existing local volumes created before
  docs/adr/0024 must be recreated once so the init script can create the
  roles and grants. Aspire expects the secret parameters
  `identity-db-password`, `services-db-password`,
  `assistant-worker-secret`, and `tenant-provisioning-secret`.
